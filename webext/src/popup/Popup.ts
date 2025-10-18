// ULTRA SIMPLE VERSION - FIXED
const root = document.getElementById("app")!;

root.innerHTML = `
  <div style="font-family:sans-serif;padding:16px;width:380px;background:#f8fafc">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:16px;margin-bottom:16px;box-shadow:0 4px 12px rgba(102,126,234,0.3)">
      <div style="font-size:22px;font-weight:700;margin-bottom:4px">💎 VogPlus</div>
      <div style="font-size:14px;opacity:0.95" id="subtitle">Loading...</div>
    </div>
    <div id="content" style="text-align:center;padding:20px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
      <div style="color:#666">🔍 Fetching your perks...</div>
    </div>
  </div>
`;

const content = document.getElementById("content")!;
const subtitle = document.getElementById("subtitle")!;

// Get current tab
chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
  if (!tab?.url) {
    content.innerHTML =
      '<div style="color:#dc2626;font-weight:600">❌ No active tab</div>';
    return;
  }

  const hostname = new URL(tab.url).hostname;
  subtitle.textContent = hostname;

  // Get token - FIX: get the whole result object first
  const storage = await chrome.storage.sync.get(["accessToken", "apiBase"]);
  const accessToken = storage.accessToken;
  const apiBase = storage.apiBase || "http://localhost:8000";

  console.log("Token check:", accessToken ? "FOUND" : "MISSING");

  if (!accessToken) {
    // Show login form
    content.innerHTML = `
      <div style="text-align:left">
        <div style="color:#111;font-weight:700;font-size:18px;margin-bottom:8px">🔐 Sign in</div>
        <p style="font-size:13px;color:#666;margin-bottom:16px">Enter your VogPlus credentials</p>
        
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
            Open VogPlus App
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

        // Save token to extension storage
        await chrome.storage.sync.set({
          accessToken: data.access_token,
          apiBase: apiBase,
        });

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
      chrome.tabs.create({ url: "http://localhost:5173" });
    };

    // Focus email input
    emailInput.focus();

    return;
  }

  // Fetch recommendations DIRECTLY
  try {
    content.innerHTML = `
      <div style="color:#667eea;font-weight:600;margin-bottom:8px">⏳ Calling API...</div>
      <div style="font-size:13px;color:#666">${hostname}</div>
    `;

    const response = await fetch(apiBase + "/api/ai/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      },
      body: JSON.stringify({ domain: hostname }),
    });

    console.log("API Response:", response.status);

    if (!response.ok) {
      content.innerHTML = `
        <div style="color:#dc2626;font-weight:600">❌ API Error</div>
        <div style="font-size:13px;color:#666;margin-top:8px">Status: ${response.status}</div>
      `;
      return;
    }

    const data = await response.json();
    const recs = data?.recommendations || [];

    console.log("Recommendations:", recs.length);

    if (recs.length === 0) {
      content.innerHTML = `
        <div style="font-weight:600;font-size:16px;margin-bottom:8px">🔍 No perks for ${hostname}</div>
        <p style="font-size:13px;color:#666;line-height:1.5">We couldn't find any benefits matching this site.<br><br>Try <strong>amazon.co.uk</strong>, <strong>booking.com</strong>, or other sites where you have perks!</p>
      `;
      return;
    }

    // Render recommendations with proper event listeners
    const cards = recs
      .slice(0, 3)
      .map((rec, idx) => {
        const kindColors = {
          tip: "background:#d1fae5;color:#059669",
          overlap: "background:#fee2e2;color:#dc2626",
          unused: "background:#fffbeb;color:#f59e0b",
          switch: "background:#e0e7ff;color:#4f46e5",
          bundle: "background:#dbeafe;color:#2563eb",
        };
        const kindStyle =
          kindColors[rec.kind as keyof typeof kindColors] ||
          "background:#f3f4f6;color:#666";

        return `
        <div style="border:2px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:10px;background:white;transition:all 0.2s;cursor:pointer" class="rec-card" data-idx="${idx}">
          <div style="display:flex;align-items:start;gap:12px;margin-bottom:10px">
            <div style="font-size:24px;line-height:1">${
              rec.kind === "tip"
                ? "✨"
                : rec.kind === "overlap"
                ? "⚠️"
                : rec.kind === "unused"
                ? "💡"
                : "🎯"
            }</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:15px;margin-bottom:4px;color:#111">${
                rec.title
              }</div>
              <span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;${kindStyle};text-transform:uppercase;letter-spacing:0.5px">${
          rec.kind
        }</span>
            </div>
          </div>
          <div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px">${
            rec.rationale
          }</div>
          <button class="action-btn" data-idx="${idx}" data-url="${
          rec.action_url || ""
        }" style="background:#667eea;color:white;border:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;width:100%;transition:all 0.2s;box-shadow:0 2px 4px rgba(102,126,234,0.2)">
            ${rec.action_url ? "🎯 Take Action" : "✓ View Details"}
          </button>
        </div>
      `;
      })
      .join("");

    content.innerHTML = `
      <div style="text-align:left">
        <div style="font-weight:700;margin-bottom:16px;font-size:18px;color:#111;display:flex;align-items:center;gap:8px">
          <span>💰</span>
          <span>${recs.length} Way${recs.length > 1 ? "s" : ""} to Save</span>
        </div>
        ${cards}
      </div>
    `;

    // Attach event listeners properly (no inline onclick!)
    recs.slice(0, 3).forEach((rec, idx) => {
      const btn = content.querySelector(
        `[data-idx="${idx}"].action-btn`
      ) as HTMLButtonElement;
      if (btn) {
        btn.onclick = (e) => {
          e.stopPropagation();
          const url = rec.action_url || "http://localhost:5173/recommendations";
          chrome.tabs.create({ url });
        };

        // Hover effect
        btn.onmouseenter = () => {
          btn.style.background = "#5a67d8";
          btn.style.transform = "translateY(-2px)";
          btn.style.boxShadow = "0 4px 8px rgba(102,126,234,0.3)";
        };
        btn.onmouseleave = () => {
          btn.style.background = "#667eea";
          btn.style.transform = "translateY(0)";
          btn.style.boxShadow = "0 2px 4px rgba(102,126,234,0.2)";
        };
      }
    });
  } catch (e) {
    console.error("Error:", e);
    content.innerHTML = `
      <div style="color:#dc2626;font-weight:600;margin-bottom:8px">❌ Error</div>
      <div style="font-size:12px;color:#666;word-break:break-word">${String(
        e
      )}</div>
    `;
  }
});
