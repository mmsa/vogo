import { gs, ss } from "../lib/storage";

const CACHE = "domainCache";

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type !== "PAGE_CONTEXT") return;

  const { hostname, isCheckout } = msg;
  const cache = (await gs<Record<string, any>>(CACHE, "local")) || {};
  const cached = cache[hostname];
  const now = Date.now();

  // Check cache (10 min TTL)
  if (cached && now - cached.ts < 10 * 60 * 1000) {
    chrome.runtime.sendMessage({
      type: "RECS",
      hostname,
      data: cached.data
    });
    return;
  }

  // Fetch fresh recommendations
  const apiBase = (await gs<string>("apiBase")) || "http://localhost:8000";
  const token = await gs<string>("accessToken");

  try {
    const r = await fetch(apiBase + "/api/ai/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ domain: hostname })
    });

    if (!r.ok) throw new Error(String(r.status));

    const data = await r.json();

    // Update cache
    cache[hostname] = { ts: now, data };
    await ss(CACHE, cache, "local");

    // Send to popup
    chrome.runtime.sendMessage({
      type: "RECS",
      hostname,
      data
    });

    // Auto-open on checkout if enabled
    const autoOpen = await gs<boolean>("autoOpen");
    if (autoOpen && isCheckout && (data?.recommendations?.length || 0) > 0) {
      try {
        await chrome.action.openPopup();
      } catch (e) {
        // Popup can only be opened on user interaction in some cases
        console.log("Could not auto-open popup:", e);
      }
    }
  } catch (e) {
    chrome.runtime.sendMessage({
      type: "RECS_ERROR",
      hostname,
      error: String(e)
    });
  }
});

