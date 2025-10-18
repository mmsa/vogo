const root = document.getElementById("app")!;

root.innerHTML = `
  <div class="wrap">
    <div class="row">
      <h3>VogPlus</h3>
      <span id="domain" class="chip"></span>
    </div>
    <div id="auth"></div>
    <div id="results" class="list"></div>
  </div>
`;

// Get current tab domain
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const domainEl = document.getElementById("domain")!;
  if (tab?.url) {
    try {
      domainEl.textContent = new URL(tab.url).hostname;
    } catch {
      domainEl.textContent = "Invalid URL";
    }
  } else {
    domainEl.textContent = "No tab";
  }
});

// Listen for recommendations
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "RECS") {
    render(msg.data);
  } else if (msg.type === "RECS_ERROR") {
    const list = document.getElementById("results")!;
    list.innerHTML = `<div class="muted error">Error: ${msg.error}</div>`;
  }
});

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

