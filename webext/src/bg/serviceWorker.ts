import { gs, ss } from "../lib/storage";

const CACHE = "domainCache";
const LAST_RECS = "lastRecs";

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
  const cached = cache[hostname];
  const now = Date.now();

  // Check cache (10 min TTL)
  if (cached && now - cached.ts < 10 * 60 * 1000) {
    console.log("  ✅ Using cached data");
    await ss(LAST_RECS, { hostname, data: cached.data, error: null }, "local");
    notifyPopup();
    
    // Show badge if cached data has matches (like Honey)
    if (cached.data?.recommendations?.length > 0 && tabId) {
      try {
        chrome.tabs.sendMessage(tabId, {
          type: "SHOW_BADGE",
          message: cached.data.recommendations[0]?.title || "You have benefits available on this site!",
          benefitCount: cached.data.relevant_benefits?.length || 0,
        }).catch(() => {});
      } catch (e) {
        // Ignore errors
      }
    }
    return;
  }

  // Fetch fresh recommendations
  const apiBase = (await gs<string>("apiBase")) || "http://localhost:8000";
  const token = await gs<string>("accessToken");

  console.log("  📡 Fetching fresh data from", apiBase);
  console.log("  🔑 Token:", token ? `present (${token.substring(0, 20)}...)` : "MISSING");
  
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
    // Use NEW semantic matching endpoint
    const r = await fetch(apiBase + "/api/check-semantic", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ url: msg.url }),
    });

    console.log("  📥 Response status:", r.status);

    if (!r.ok) {
      throw new Error(
        r.status === 401 ? "Authentication failed" : `HTTP ${r.status}`
      );
    }

    const data = await r.json();

    // Transform semantic response to match old format for popup
    const transformed = {
      recommendations: data.has_matches
        ? [
            {
              title: data.message,
              kind: "tip",
              action_url: null,
              estimated_saving_min: null,
              estimated_saving_max: null,
            },
          ]
        : [],
      relevant_benefits: data.highlight_benefit_ids || [],
    };

    console.log(
      "  ✅ Got semantic match:",
      data.has_matches ? "YES" : "NO",
      data.message
    );

    // Update cache
    cache[hostname] = { ts: now, data: transformed };
    await ss(CACHE, cache, "local");

    // Store for popup
    await ss(LAST_RECS, { hostname, data: transformed, error: null }, "local");
    console.log("  💾 Stored in LAST_RECS");
    notifyPopup();

    // Automatically show floating badge if benefits found (like Honey)
    if (data.has_matches && tabId) {
      try {
        chrome.tabs.sendMessage(tabId, {
          type: "SHOW_BADGE",
          message: data.message || "You have benefits available on this site!",
          benefitCount: data.highlight_benefit_ids?.length || 0,
        }).catch((e) => {
          // Content script might not be ready, that's okay
          console.log("Could not send badge message:", e);
        });
      } catch (e) {
        console.log("Could not show badge:", e);
      }
    } else if (!data.has_matches && tabId) {
      // Hide badge if no matches
      try {
        chrome.tabs.sendMessage(tabId, {
          type: "HIDE_BADGE",
        }).catch(() => {});
      } catch (e) {
        // Ignore errors
      }
    }

    // Auto-open on checkout if enabled
    const autoOpen = await gs<boolean>("autoOpen");
    if (autoOpen && isCheckout && data.has_matches) {
      try {
        await chrome.action.openPopup();
      } catch (e) {
        console.log("Could not auto-open popup:", e);
      }
    }
  } catch (e) {
    console.error("  ❌ Error:", e);
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
