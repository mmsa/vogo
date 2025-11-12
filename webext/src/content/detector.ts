// Inject floating badge when benefits are found
function injectBadge(message: string, benefitCount: number) {
  // Remove existing badge if any
  const existing = document.getElementById("vogoplus-badge");
  if (existing) {
    existing.remove();
  }

  // Create badge element
  const badge = document.createElement("div");
    badge.id = "vogoplus-badge";
  badge.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 320px;
      cursor: pointer;
      animation: slideInRight 0.3s ease-out;
      transition: transform 0.2s;
    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 24px;">💎</div>
        <div style="flex: 1;">
          <div style="font-weight: 700; margin-bottom: 4px; font-size: 15px;">vogoplus.app Found Perks!</div>
          <div style="font-size: 13px; opacity: 0.95; line-height: 1.4;">${message}</div>
          ${benefitCount > 0 ? `<div style="font-size: 12px; opacity: 0.9; margin-top: 6px;">${benefitCount} benefit${benefitCount > 1 ? 's' : ''} available</div>` : ''}
        </div>
        <button id="vogoplus-badge-close" style="
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">×</button>
      </div>
    </div>
    <style>
      @keyframes slideInRight {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    </style>
  `;

  document.body.appendChild(badge);

  // Close button handler
  const closeBtn = badge.querySelector("#vogoplus-badge-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      badge.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => badge.remove(), 300);
    });
  }

  // Click badge to open extension popup
  badge.addEventListener("click", (e) => {
    if (e.target !== closeBtn) {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
    }
  });

  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (badge.parentNode) {
      badge.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => badge.remove(), 300);
    }
  }, 10000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "SHOW_BADGE") {
    injectBadge(msg.message, msg.benefitCount || 0);
  } else if (msg?.type === "HIDE_BADGE") {
    const badge = document.getElementById("vogoplus-badge");
    if (badge) {
      badge.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => badge.remove(), 300);
    }
  }
});

const send = () => {
  // Skip localhost and extension pages
  if (
    location.hostname === "localhost" ||
    location.protocol === "chrome-extension:"
  ) {
    return;
  }

  chrome.runtime.sendMessage({
    type: "PAGE_CONTEXT",
    hostname: location.hostname,
    url: location.href,
    isCheckout: /checkout|cart|payment|subscribe|plan/i.test(location.href),
  });
};

// Wait for DOM to be ready before sending
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", send);
} else {
  send();
}

addEventListener("popstate", send);
addEventListener("hashchange", send);
