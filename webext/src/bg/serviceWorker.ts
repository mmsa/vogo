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
  const fetchForContext = async (domain?: string) => {
    const payload = domain
      ? { user_id: userId, context: { domain } }
      : { user_id: userId };

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

    return response.json();
  };

  const normalizedDomain = normalizeDomain(hostname);
  const domainScoped = await fetchForContext(normalizedDomain);
  if (
    (domainScoped.recommendations?.length || 0) > 0 ||
    (domainScoped.relevant_benefits?.length || 0) > 0
  ) {
    return domainScoped;
  }

  return fetchForContext();
}

// Process tab URL automatically
async function processTabUrl(tabId: number, url: string) {
  // Ignore system URLs
  if (shouldIgnoreUrl(url)) {
    console.log("🔧 Ignoring system URL:", url);
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

    console.log("🔧 Auto-detecting URL:", hostname);

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
    console.log("Could not access tab:", e);
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
      console.log("Could not open popup:", e);
    }
    return true;
  }
});

async function handlePageContext(msg: any, tabId?: number) {
  const { hostname, isCheckout } = msg;
  console.log("🔧 Service Worker: Handling", hostname);

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
    console.log("  ✅ Using cached data");
    await ss(LAST_RECS, { hostname, data: cached.data, error: null }, "local");
    notifyPopup();

    // Show badge if cached data has matches (like Honey)
    if (cached.data?.recommendations?.length > 0 && tabId) {
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
              cached.data.recommendations[0]?.title ||
              "You have benefits available on this site!",
            benefitCount: cached.data.relevant_benefits?.length || 0,
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

  console.log("  📡 Fetching fresh data from", apiBase);
  console.log(
    "  🔑 Token:",
    token ? `present (${token.substring(0, 20)}...)` : "MISSING"
  );

  // DEBUG: Check all storage
  const allSync = await chrome.storage.sync.get(null);
  console.log("  🗄️  All sync storage keys:", Object.keys(allSync));

  if (!token) {
    console.error("  ❌ No token in storage!");
    console.error("  💡 User needs to log in via the extension popup");
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

    console.log(
      "  ✅ Got recommendations:",
      data.recommendations?.length || 0,
      "recommendations,",
      data.relevant_benefits?.length || 0,
      "relevant benefits"
    );

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
    console.log("  💾 Stored in LAST_RECS");
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
            console.log("Could not send badge message:", e);
          });

        // Update badge icon
        chrome.action.setBadgeText({
          text: "✓",
          tabId,
        });
        chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
      } catch (e) {
        console.log("Could not show badge:", e);
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
        console.log("Could not auto-open popup:", e);
      }
    }
  } catch (e) {
    console.error("  ❌ Error:", e);
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
