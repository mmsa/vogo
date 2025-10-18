import { gs, ss } from "../lib/storage";

const CACHE = "domainCache";
const LAST_RECS = "lastRecs";

// Handle messages from content script
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg?.type === "PAGE_CONTEXT") {
    // Process in background, don't block
    handlePageContext(msg);
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
});

async function handlePageContext(msg: any) {
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
    return;
  }

  // Fetch fresh recommendations
  const apiBase = (await gs<string>("apiBase")) || "http://localhost:8000";
  const token = await gs<string>("accessToken");

  console.log("  📡 Fetching fresh data from", apiBase);
  console.log("  🔑 Token:", token ? "present" : "missing");

  if (!token) {
    console.error("  ❌ No token!");
    await ss(
      LAST_RECS,
      {
        hostname,
        data: null,
        error: "Not authenticated. Please set your token in Options.",
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
