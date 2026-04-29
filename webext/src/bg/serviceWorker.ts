import { gs, ss, rm } from "../lib/storage";
import {
  authenticatedFetch,
  clearSession,
  getApiBase,
  getToken,
  USER_ID_KEY,
} from "../lib/auth";

const CACHE = "domainCache";
const PAGE_CACHE = "pageCache";
const LAST_RECS = "lastRecs";
const CACHE_VERSION_KEY = "recsCacheVersion";
const CACHE_VERSION = 2;
const ALLOWED_KINDS = new Set(["overlap", "tip", "unused"]);

// Debounce helper to avoid spamming API calls
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

// Track last processed URL to avoid duplicate checks
let lastProcessedUrl: string | null = null;

// Check if URL should be ignored (system pages)
function shouldIgnoreUrl(url: string): boolean {
  if (!url) return true;
  const protocol = new URL(url).protocol;
  return (
    protocol === "chrome:" ||
    protocol === "chrome-extension:" ||
    protocol === "moz-extension:" ||
    protocol === "edge:" ||
    protocol === "about:" ||
    protocol === "file:"
  );
}

function normalizeDomain(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

async function ensureCacheVersion() {
  const currentVersion = await gs<number>(CACHE_VERSION_KEY, "local");
  if (currentVersion === CACHE_VERSION) {
    return;
  }

  await Promise.all([
    rm(CACHE, "local"),
    rm(PAGE_CACHE, "local"),
    rm(LAST_RECS, "local"),
    ss(CACHE_VERSION_KEY, CACHE_VERSION, "local"),
  ]);
}

function sanitizeSiteScopedData(data: any) {
  const relevantBenefits = Array.isArray(data?.relevant_benefits)
    ? data.relevant_benefits.filter((id: unknown) => Number.isInteger(id))
    : [];
  const relevantBenefitIds = new Set<number>(relevantBenefits);
  const recommendations = Array.isArray(data?.recommendations)
    ? data.recommendations.filter((rec: any) => {
        if (!rec || !ALLOWED_KINDS.has(rec.kind)) {
          return false;
        }

        const benefitMatchIds = Array.isArray(rec.benefit_match_ids)
          ? rec.benefit_match_ids.filter((id: unknown) => Number.isInteger(id))
          : [];

        return benefitMatchIds.some((id: number) => relevantBenefitIds.has(id));
      })
    : [];

  return {
    recommendations,
    relevant_benefits: relevantBenefits,
  };
}

async function getCurrentUserId(apiBase: string): Promise<number> {
  const cachedUserId = await gs<number>(USER_ID_KEY);
  if (typeof cachedUserId === "number" && Number.isFinite(cachedUserId)) {
    return cachedUserId;
  }

  const response = await authenticatedFetch("/api/auth/me", {}, apiBase);

  if (!response.ok) {
    throw new Error(
      response.status === 401 ? "Authentication failed" : `HTTP ${response.status}`
    );
  }

  const user = await response.json();
  await ss(USER_ID_KEY, user.id);
  return user.id;
}

async function fetchRecommendations(
  apiBase: string,
  userId: number,
  hostname: string
) {
  const payload = { user_id: userId, context: { domain: normalizeDomain(hostname) } };

  const response = await authenticatedFetch(
    "/api/llm/recommendations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    apiBase
  );

  if (!response.ok) {
    throw new Error(
      response.status === 401 ? "Authentication failed" : `HTTP ${response.status}`
    );
  }

  const data = await response.json();
  return sanitizeSiteScopedData(data);
}

// Process tab URL automatically
async function processTabUrl(tabId: number, url: string) {
  // Ignore system URLs
  if (shouldIgnoreUrl(url)) {
    return;
  }

  // Skip if same URL was just processed
  if (url === lastProcessedUrl) {
    return;
  }

  try {
    const urlObj = new URL(url);
    const hostname = normalizeDomain(urlObj.hostname);
    const isCheckout = /checkout|cart|payment|subscribe|plan/i.test(url);

    // Call existing handler
    await handlePageContext(
      {
        hostname,
        url,
        isCheckout,
      },
      tabId
    );

    lastProcessedUrl = url;
  } catch (e) {
    console.error("Error processing tab URL:", e);
  }
}

// Automatic tab detection - listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process when page finishes loading
  if (changeInfo.status !== "complete" || !tab.url) {
    return;
  }

  // Debounce to avoid spamming
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    processTabUrl(tabId, tab.url!);
  }, DEBOUNCE_MS);
});

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      // Debounce to avoid spamming
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        processTabUrl(activeInfo.tabId, tab.url!);
      }, DEBOUNCE_MS);
    }
  } catch (e) {
    // Tab might not be accessible (e.g., chrome:// pages)
    console.debug("Could not access tab:", e);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg?.type === "PAGE_CONTEXT") {
    // Process in background, don't block
    handlePageContext(msg, sender.tab?.id);
    return true;
  }

  // Handle popup requests for recommendations
  if (msg?.type === "GET_RECS") {
    const lastRecs = await gs<any>(LAST_RECS, "local");
    sendResponse(
      lastRecs || { hostname: msg.hostname, data: null, error: null }
    );
    return true;
  }

  // Handle open popup request from content script
  if (msg?.type === "OPEN_POPUP") {
    try {
      await chrome.action.openPopup();
    } catch (e) {
      console.debug("Could not open popup:", e);
    }
    return true;
  }
});

async function handlePageContext(msg: any, tabId?: number) {
  const { hostname, isCheckout } = msg;
  await ensureCacheVersion();

  const cache = (await gs<Record<string, any>>(CACHE, "local")) || {};
  const pageCache = (await gs<Record<string, any>>(PAGE_CACHE, "local")) || {};
  const urlKey = msg.url ? new URL(msg.url).origin + new URL(msg.url).pathname : "";
  const cached = (urlKey && pageCache[urlKey]) || cache[hostname];
  const now = Date.now();

  // Check cache (page: 60 min TTL, domain: 10 min TTL)
  const pageTtlMs = 60 * 60 * 1000;
  const domainTtlMs = 10 * 60 * 1000;
  if (
    cached &&
    now - cached.ts <
      (urlKey && pageCache[urlKey] ? pageTtlMs : domainTtlMs)
  ) {
    const sanitizedCachedData = sanitizeSiteScopedData(cached.data);
    await ss(LAST_RECS, { hostname, data: sanitizedCachedData, error: null }, "local");
    notifyPopup();

    // Show badge if cached data has matches (like Honey)
    if (sanitizedCachedData.recommendations?.length > 0 && tabId) {
      try {
        // Inject content script if needed
        await chrome.scripting
          .executeScript({
            target: { tabId },
            files: ["content/detector.js"],
          })
          .catch(() => {});

        await new Promise((resolve) => setTimeout(resolve, 100));

        chrome.tabs
          .sendMessage(tabId, {
            type: "SHOW_BADGE",
            message:
              sanitizedCachedData.recommendations[0]?.title ||
              "You have benefits available on this site!",
            benefitCount: sanitizedCachedData.relevant_benefits?.length || 0,
          })
          .catch(() => {});

        chrome.action.setBadgeText({
          text: "✓",
          tabId,
        });
        chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
      } catch (e) {
        // Ignore errors
      }
    }
    return;
  }

  // Fetch fresh recommendations
  const [apiBase, token] = await Promise.all([getApiBase(), getToken()]);

  if (!token) {
    await ss(
      LAST_RECS,
      {
        hostname,
        data: null,
        error: "Not authenticated. Please log in via the extension popup.",
      },
      "local"
    );
    notifyPopup();
    return;
  }

  try {
    const userId = await getCurrentUserId(apiBase);
    const data = await fetchRecommendations(apiBase, userId, hostname);

    // Update cache
    cache[hostname] = { ts: now, data };
    if (urlKey) {
      pageCache[urlKey] = { ts: now, data };
    }
    await ss(CACHE, cache, "local");
    if (urlKey) {
      await ss(PAGE_CACHE, pageCache, "local");
    }

    // Store for popup
    await ss(LAST_RECS, { hostname, data, error: null }, "local");
    notifyPopup();

    // Automatically inject content script and show badge if benefits found
    if ((data.recommendations?.length || 0) > 0 && tabId) {
      try {
        // Inject content script first (if not already injected)
        await chrome.scripting
          .executeScript({
            target: { tabId },
            files: ["content/detector.js"],
          })
          .catch(() => {
            // Script might already be injected, that's okay
          });

        // Small delay to ensure script is ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Send badge message
        chrome.tabs
          .sendMessage(tabId, {
            type: "SHOW_BADGE",
            message:
              data.recommendations[0]?.title ||
              data.recommendations[0]?.rationale ||
              "You have benefits available on this site!",
            benefitCount: data.relevant_benefits?.length || 0,
          })
          .catch((e) => {
            // Content script might not be ready, that's okay
            console.debug("Could not send badge message:", e);
          });

        // Update badge icon
        chrome.action.setBadgeText({
          text: "✓",
          tabId,
        });
        chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
      } catch (e) {
        console.debug("Could not show badge:", e);
      }
    } else if ((data.recommendations?.length || 0) === 0 && tabId) {
      // Hide badge if no matches
      try {
        chrome.tabs
          .sendMessage(tabId, {
            type: "HIDE_BADGE",
          })
          .catch(() => {});
        chrome.action.setBadgeText({ text: "", tabId });
      } catch (e) {
        // Ignore errors
      }
    }

    // Auto-open on checkout if enabled
    const autoOpen = await gs<boolean>("autoOpen");
    if (autoOpen && isCheckout && (data.recommendations?.length || 0) > 0) {
      try {
        await chrome.action.openPopup();
      } catch (e) {
        console.debug("Could not auto-open popup:", e);
      }
    }
  } catch (e) {
    console.error("Extension request failed:", e);
    if (String(e).includes("AUTH_") || String(e).includes("Authentication failed")) {
      await clearSession();
      await rm(CACHE, "local");
      await rm(PAGE_CACHE, "local");
      await rm(LAST_RECS, "local");
    }
    await ss(
      LAST_RECS,
      {
        hostname,
        data: null,
        error: String(e),
      },
      "local"
    );
    notifyPopup();
  }
}

// Safely notify popup if it's open
function notifyPopup() {
  try {
    chrome.runtime.sendMessage({ type: "RECS_UPDATED" }).catch(() => {
      // Popup not open, that's fine
    });
  } catch {
    // Extension context invalidated or popup not open
  }
}
