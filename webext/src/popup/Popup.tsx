const root = document.getElementById("app")!;
let currentHostname = "";

root.innerHTML = `
  <div class="wrap">
    <div class="row">
      <h3>VogPlus</h3>
      <span id="domain" class="chip"></span>
    </div>
    <div id="auth"></div>
    <div id="results" class="list">
      <div class="muted">Loading...</div>
    </div>
  </div>
`;

// Get current tab domain and fetch recommendations
chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
  const domainEl = document.getElementById("domain")!;
  if (tab?.url) {
    try {
      currentHostname = new URL(tab.url).hostname;
      domainEl.textContent = currentHostname;
      await loadRecommendations();
    } catch {
      domainEl.textContent = "Invalid URL";
      showError("Invalid URL");
    }
  } else {
    domainEl.textContent = "No tab";
    showError("No active tab");
  }
});

// Listen for updates from service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "RECS_UPDATED") {
    loadRecommendations();
  }
});

// Load recommendations from storage
async function loadRecommendations() {
  try {
    // Request latest data from service worker
    const response = await chrome.runtime.sendMessage({ 
      type: "GET_RECS", 
      hostname: currentHostname 
    });

    if (response?.error) {
      showError(response.error);
    } else if (response?.data) {
      render(response.data);
    } else {
      showError("No recommendations available yet. Refresh the page.");
    }
  } catch (e) {
    showError("Failed to load recommendations: " + String(e));
  }
}

function showError(message: string) {
  const list = document.getElementById("results")!;
  list.innerHTML = `<div class="muted error">${message}</div>`;
}

function render(data: any) {
  const list = document.getElementById("results")!;
  const recs = data?.recommendations || [];

  if (!recs.length) {
    list.innerHTML = `<div class="muted">No perks detected for this site. Try Discover in Options.</div>`;
    return;
  }

  list.innerHTML = recs
    .slice(0, 3)
    .map(
      (r: any) => `
    <div class="card">
      <div class="title">${r.title}</div>
      <div class="rationale">${r.rationale}</div>
      <div class="meta">
        ${r.estimated_saving_min ? `<span class="badge">£${r.estimated_saving_min}${r.estimated_saving_max ? "–£" + r.estimated_saving_max : ""}</span>` : ""}
        <button class="cta" data-url="${r.action_url || ""}">Take Action</button>
      </div>
    </div>
  `
    )
    .join("");

  // Add click handlers
  list.querySelectorAll(".cta").forEach((b: any) => {
    b.onclick = () => {
      const u = b.dataset.url;
      if (u) chrome.tabs.create({ url: u });
    };
  });
}

