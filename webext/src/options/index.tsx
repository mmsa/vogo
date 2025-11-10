import { gs, ss } from "../lib/storage";

const root = document.getElementById("app")!;

root.innerHTML = `
<div style="font-family: ui-sans-serif, system-ui; padding: 24px; max-width: 640px; margin: 0 auto;">
  <h2 style="color: #5B4BFB; margin-bottom: 24px;">vogoplus.app Options</h2>
  
  <div style="margin-bottom: 20px;">
    <label style="display: block; margin-bottom: 8px; font-weight: 600;">
      API Base URL
    </label>
    <input 
      id="api" 
      type="text"
      style="width: 100%; padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;"
      placeholder="https://app.vogoplus.app"
    />
    <p style="font-size: 12px; color: #666; margin-top: 4px;">
      Default: https://app.vogoplus.app (change for local development)
    </p>
  </div>
  
  <div style="margin-bottom: 20px;">
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
      <input type="checkbox" id="auto" style="width: 18px; height: 18px; cursor: pointer;"/>
      <span style="font-weight: 600;">Auto-open popup on checkout pages</span>
    </label>
    <p style="font-size: 12px; color: #666; margin-top: 4px; margin-left: 26px;">
      Automatically show recommendations when you visit checkout/cart pages
    </p>
  </div>
  
  <div style="margin-top: 32px; display: flex; gap: 12px;">
    <button 
      id="save" 
      style="background: #5B4BFB; color: white; border: 0; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;"
    >
      Save Settings
    </button>
    <button 
      id="clear" 
      style="background: #ef4444; color: white; border: 0; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;"
    >
      Clear Cache
    </button>
  </div>
  
  <div id="status" style="margin-top: 16px; padding: 12px; border-radius: 8px; display: none;"></div>
</div>
`;

// Load saved settings
(async () => {
  const apiInput = document.getElementById("api") as HTMLInputElement;
  const autoCheck = document.getElementById("auto") as HTMLInputElement;
  
  apiInput.value = (await gs("apiBase")) || "https://app.vogoplus.app";
  autoCheck.checked = !!(await gs("autoOpen"));
})();

// Save button
document.getElementById("save")!.onclick = async () => {
  const apiInput = document.getElementById("api") as HTMLInputElement;
  const autoCheck = document.getElementById("auto") as HTMLInputElement;
  const status = document.getElementById("status")!;
  
  await ss("apiBase", apiInput.value);
  await ss("autoOpen", autoCheck.checked);
  
  status.textContent = "✓ Settings saved successfully!";
  status.style.background = "#e8f7ee";
  status.style.color = "#059669";
  status.style.display = "block";
  
  setTimeout(() => {
    status.style.display = "none";
  }, 3000);
};

// Clear cache button
document.getElementById("clear")!.onclick = async () => {
  const status = document.getElementById("status")!;
  
  await chrome.storage.local.clear();
  
  status.textContent = "✓ Cache cleared successfully!";
  status.style.background = "#fef3c7";
  status.style.color = "#d97706";
  status.style.display = "block";
  
  setTimeout(() => {
    status.style.display = "none";
  }, 3000);
};

