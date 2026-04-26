// ULTRA SIMPLE VERSION - FIXED
const root = document.getElementById("app")!;

root.innerHTML = `
  <div style="font-family:sans-serif;padding:16px;width:380px;background:#f8fafc">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:16px;margin-bottom:16px;box-shadow:0 4px 12px rgba(102,126,234,0.3)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <img src="${chrome.runtime.getURL(
          "logo.png"
        )}" alt="vogoplus.app" style="width:24px;height:24px" />
        <div style="font-size:22px;font-weight:700">vogoplus.app</div>
      </div>
      <div style="font-size:14px;opacity:0.95" id="subtitle">Loading...</div>
    </div>
    <div id="content" style="text-align:center;padding:20px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
      <div style="color:#666">🔍 Fetching your perks...</div>
    </div>
  </div>
`;

const content = document.getElementById("content")!;
const subtitle = document.getElementById("subtitle")!;
const USER_ID_KEY = "userId";
const signedInFooter = `
  <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#6b7280">
    <span>Signed in via extension</span>
    <button id="signOutBtn" style="background:transparent;border:none;color:#ef4444;font-weight:600;cursor:pointer;padding:0">Sign out</button>
  </div>
`;

const normalizeDomain = (hostname: string) =>
  hostname.replace(/^www\./i, "").toLowerCase();

const renderBenefitsList = (items: any[]) =>
  items
    .slice(0, 3)
    .map(
      (item) => `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;background:#f9fafb">
          <div style="font-weight:600;font-size:14px;color:#111;margin-bottom:4px">${
            item.title
          }</div>
          ${
            item.description
              ? `<div style="font-size:12px;color:#666;margin-bottom:6px">${item.description}</div>`
              : ""
          }
        </div>
      `
    )
    .join("");

const renderRecommendationsList = (items: any[]) =>
  items
    .slice(0, 3)
    .map(
      (item) => `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;background:#f9fafb">
          <div style="font-weight:600;font-size:14px;color:#111;margin-bottom:4px">${
            item.title
          }</div>
          <div style="font-size:12px;color:#666;margin-bottom:6px">${
            item.rationale || ""
          }</div>
          ${
            item.kind
              ? `<div style="font-size:11px;color:#667eea;font-weight:600;text-transform:capitalize">${String(
                  item.kind
                ).replace(/_/g, " ")}</div>`
              : ""
          }
        </div>
      `
    )
    .join("");

async function ensureUserId(apiBase: string, accessToken: string) {
  const storage = await chrome.storage.sync.get(USER_ID_KEY);
  if (typeof storage.userId === "number") {
    return storage.userId;
  }

  const response = await fetch(apiBase + "/api/auth/me", {
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401 ? "Authentication failed" : `HTTP ${response.status}`
    );
  }

  const user = await response.json();
  await chrome.storage.sync.set({ userId: user.id });
  return user.id;
}

async function fetchRecommendations(
  apiBase: string,
  accessToken: string,
  userId: number,
  hostname: string
) {
  const fetchForContext = async (domain?: string) => {
    const payload = domain
      ? { user_id: userId, context: { domain } }
      : { user_id: userId };

    const response = await fetch(apiBase + "/api/llm/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        response.status === 401 ? "Authentication failed" : `HTTP ${response.status}`
      );
    }

    return response.json();
  };

  const domainScoped = await fetchForContext(normalizeDomain(hostname));
  if (
    (domainScoped.recommendations?.length || 0) > 0 ||
    (domainScoped.relevant_benefits?.length || 0) > 0
  ) {
    return domainScoped;
  }

  return fetchForContext();
}

function renderResultState(hostname: string, data: any) {
  const recommendations = data.recommendations || [];
  const relevantBenefits = data.relevant_benefits || [];

  if (recommendations.length === 0 && relevantBenefits.length === 0) {
    content.innerHTML = `
      <div style="font-weight:600;font-size:16px;margin-bottom:8px">🔍 No recommendations for ${hostname}</div>
      <p style="font-size:13px;color:#666;line-height:1.5">The same recommendations API used by the web app did not return any matches right now for this account.</p>
      <button id="openAppBtn" style="background:#667eea;color:white;border:none;padding:12px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;width:100%;margin-top:12px;transition:all 0.2s;box-shadow:0 2px 6px rgba(102,126,234,0.3)">
        🚀 View Full Dashboard
      </button>
      ${signedInFooter}
    `;
  } else if (recommendations.length === 0) {
    content.innerHTML = `
      <div style="text-align:left">
        <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:16px;border-radius:12px;margin-bottom:16px;box-shadow:0 4px 12px rgba(16,185,129,0.3)">
          <div style="font-size:20px;margin-bottom:8px">✨</div>
          <div style="font-size:15px;font-weight:600;line-height:1.5">You have relevant benefits for ${hostname}.</div>
        </div>
        <div style="font-size:13px;color:#666;margin-bottom:12px;font-weight:600">Relevant benefits (${relevantBenefits.length}):</div>
        ${renderBenefitsList(relevantBenefits)}
        <button id="openAppBtn" style="background:#667eea;color:white;border:none;padding:12px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;width:100%;margin-top:8px;transition:all 0.2s;box-shadow:0 2px 6px rgba(102,126,234,0.3)">
          🚀 View Full Dashboard
        </button>
        ${signedInFooter}
      </div>
    `;
  } else {
    content.innerHTML = `
      <div style="text-align:left">
        <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:16px;border-radius:12px;margin-bottom:16px;box-shadow:0 4px 12px rgba(16,185,129,0.3)">
          <div style="font-size:20px;margin-bottom:8px">✨</div>
          <div style="font-size:15px;font-weight:600;line-height:1.5">${
            recommendations[0]?.title || "You have recommendations available."
          }</div>
          ${
            recommendations[0]?.rationale
              ? `<div style="font-size:12px;opacity:0.9;margin-top:6px;line-height:1.4">${recommendations[0].rationale}</div>`
              : ""
          }
        </div>
        <div style="font-size:13px;color:#666;margin-bottom:12px;font-weight:600">Top recommendations (${recommendations.length}):</div>
        ${renderRecommendationsList(recommendations)}
        <button id="openAppBtn" style="background:#667eea;color:white;border:none;padding:12px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;width:100%;margin-top:8px;transition:all 0.2s;box-shadow:0 2px 6px rgba(102,126,234,0.3)">
          🚀 View Full Dashboard
        </button>
        ${signedInFooter}
      </div>
    `;
  }

  const openBtn = document.getElementById("openAppBtn");
  if (openBtn) {
    openBtn.onclick = () => chrome.tabs.create({ url: "https://app.vogoplus.app" });
  }
}

const attachSignOutHandler = async () => {
  const signOutBtn = document.getElementById("signOutBtn") as
    | HTMLButtonElement
    | null;
  if (!signOutBtn) return;
  signOutBtn.onclick = async () => {
    await chrome.storage.sync.remove(["accessToken", USER_ID_KEY]);
    await chrome.storage.local.remove(["domainCache", "pageCache", "lastRecs"]);
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "HIDE_BADGE" }).catch(() => {});
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
      }
    } catch {
      // Ignore tab access errors
    }
    location.reload();
  };
};

// Get current tab
chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
  if (!tab?.url) {
    content.innerHTML =
      '<div style="color:#dc2626;font-weight:600">❌ No active tab</div>';
    return;
  }

  // Skip chrome:// and extension pages
  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://") ||
    tab.url.startsWith("moz-extension://")
  ) {
    content.innerHTML = `
      <div style="color:#dc2626;font-weight:600">❌ Cannot analyze this page</div>
      <div style="font-size:13px;color:#666;margin-top:8px">Please navigate to a regular website.</div>
    `;
    return;
  }

  const hostname = normalizeDomain(new URL(tab.url).hostname);
  subtitle.textContent = hostname;

  // Inject content script for badge display (only when popup is opened - activeTab permission)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      files: ["content/detector.js"],
    });
  } catch (e) {
    // Content script injection failed (might be on restricted page), continue anyway
    console.log("Could not inject content script:", e);
  }

  // Get token - FIX: get the whole result object first
  const storage = await chrome.storage.sync.get(["accessToken", "apiBase"]);
  const accessToken = storage.accessToken;
  const apiBase = storage.apiBase || "https://app.vogoplus.app";

  console.log("Token check:", accessToken ? "FOUND" : "MISSING");

  if (!accessToken) {
    // Show login form
    content.innerHTML = `
      <div style="text-align:left">
        <div style="color:#111;font-weight:700;font-size:18px;margin-bottom:8px">🔐 Sign in</div>
        <p style="font-size:13px;color:#666;margin-bottom:16px">Enter your vogoplus.app credentials</p>
        
        <input type="email" id="loginEmail" placeholder="Email" 
          style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:10px;box-sizing:border-box;transition:border 0.2s">
        
        <input type="password" id="loginPassword" placeholder="Password"
          style="width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:10px;box-sizing:border-box;transition:border 0.2s">
        
        <div id="loginError" style="color:#dc2626;font-size:13px;margin-bottom:10px;display:none;font-weight:600"></div>
        
        <button id="loginBtn" style="background:#667eea;color:white;border:none;padding:12px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;width:100%;margin-bottom:10px;transition:all 0.2s;box-shadow:0 2px 6px rgba(102,126,234,0.3)">
          Sign In
        </button>
        
        <div style="text-align:center;padding-top:12px;border-top:1px solid #e5e7eb">
          <p style="font-size:12px;color:#666;margin-bottom:8px">Don't have an account?</p>
          <button id="openAppBtn" style="background:transparent;color:#667eea;border:1px solid #667eea;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s">
            Open vogoplus.app
          </button>
        </div>
      </div>
    `;

    const emailInput = document.getElementById(
      "loginEmail"
    ) as HTMLInputElement;
    const passwordInput = document.getElementById(
      "loginPassword"
    ) as HTMLInputElement;
    const loginBtn = document.getElementById("loginBtn") as HTMLButtonElement;
    const loginError = document.getElementById("loginError") as HTMLDivElement;
    const openAppBtn = document.getElementById(
      "openAppBtn"
    ) as HTMLButtonElement;

    // Add focus/blur handlers
    emailInput.onfocus = () => (emailInput.style.borderColor = "#667eea");
    emailInput.onblur = () => (emailInput.style.borderColor = "#e5e7eb");
    passwordInput.onfocus = () => (passwordInput.style.borderColor = "#667eea");
    passwordInput.onblur = () => (passwordInput.style.borderColor = "#e5e7eb");

    // Login handler
    loginBtn.onclick = async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
        loginError.textContent = "Please enter email and password";
        loginError.style.display = "block";
        return;
      }

      loginBtn.textContent = "Signing in...";
      loginBtn.disabled = true;
      loginError.style.display = "none";

      try {
        const response = await fetch(apiBase + "/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ detail: "Login failed" }));
          loginError.textContent = error.detail || "Invalid credentials";
          loginError.style.display = "block";
          loginBtn.textContent = "Sign In";
          loginBtn.disabled = false;
          return;
        }

        const data = await response.json();

        const meResponse = await fetch(apiBase + "/api/auth/me", {
          headers: {
            Authorization: "Bearer " + data.access_token,
          },
        });

        if (!meResponse.ok) {
          throw new Error("Failed to load profile");
        }

        const me = await meResponse.json();

        // Save token to extension storage
        await chrome.storage.sync.set({
          accessToken: data.access_token,
          apiBase: apiBase,
          userId: me.id,
        });

        console.log("✅ Token saved, reloading popup...");

        // Small delay to ensure storage is persisted
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Reload popup to show recommendations
        location.reload();
      } catch (e) {
        loginError.textContent = "Connection failed. Is the backend running?";
        loginError.style.display = "block";
        loginBtn.textContent = "Sign In";
        loginBtn.disabled = false;
      }
    };

    // Enter key to submit
    [emailInput, passwordInput].forEach((input) => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") loginBtn.click();
      });
    });

    // Open app button
    openAppBtn.onclick = () => {
      chrome.tabs.create({ url: "https://app.vogoplus.app" });
    };

    // Focus email input
    emailInput.focus();

    return;
  }

  // Check if background worker already has data for this hostname
  const lastRecs = await chrome.storage.local.get("lastRecs");
  const cachedData = lastRecs.lastRecs;

  // Use cached data if available and matches current hostname
  if (cachedData && cachedData.hostname === hostname && cachedData.data) {
    console.log("Using cached data from background worker");
    const data = cachedData.data;

    if (
      (data.recommendations?.length || 0) > 0 ||
      (data.relevant_benefits?.length || 0) > 0
    ) {
      renderResultState(hostname, data);
      await attachSignOutHandler();
      return;
    }
  }

  // If no cached data or cache miss, fetch fresh (background worker should handle this, but fallback)
  try {
    content.innerHTML = `
      <div style="color:#667eea;font-weight:600;margin-bottom:8px">⏳ Analyzing page...</div>
      <div style="font-size:13px;color:#666">${hostname}</div>
    `;

    const userId = await ensureUserId(apiBase, accessToken);
    const data = await fetchRecommendations(apiBase, accessToken, userId, hostname);

    console.log("Recommendations API Response:", data);

    // Send message to content script to show/hide badge
    try {
      if ((data.recommendations?.length || 0) > 0) {
        chrome.tabs
          .sendMessage(tab.id!, {
            type: "SHOW_BADGE",
            message:
              data.recommendations[0]?.title ||
              data.recommendations[0]?.rationale ||
              "You have benefits available on this site!",
            benefitCount: data.relevant_benefits?.length || 0,
          })
          .catch(() => {
            // Content script might not be injected, that's okay
          });
      } else {
        chrome.tabs
          .sendMessage(tab.id!, {
            type: "HIDE_BADGE",
          })
          .catch(() => {
            // Content script might not be injected, that's okay
          });
      }
    } catch (e) {
      // Ignore errors - badge display is optional
    }

    renderResultState(hostname, data);
    await attachSignOutHandler();
  } catch (e) {
    console.error("Error fetching recommendations:", e);
    if (String(e).includes("Authentication failed")) {
      await chrome.storage.sync.remove(["accessToken", USER_ID_KEY]);
    }
    content.innerHTML = `
      <div style="color:#dc2626;font-weight:600">❌ Connection Error</div>
      <div style="font-size:13px;color:#666;margin-top:8px">Could not reach the server. Make sure the backend is running on port 8000.</div>
      ${signedInFooter}
    `;
    await attachSignOutHandler();
  }
});
