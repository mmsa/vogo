# Chrome Extension Debugging Guide

## Quick Checks

### 1. Check if Backend is Running
```bash
# Terminal 1: Start backend
cd /Users/mmsa/Projects/vogo/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 2. Check if You're Logged In
- Open your web app at `http://localhost:5173`
- Make sure you're logged in
- The extension needs your auth token from the browser storage

### 3. Check Extension Console Logs

**Service Worker Console:**
1. Go to `chrome://extensions`
2. Find "VogPlus"
3. Click "service worker" link
4. Check for errors or API call logs

**Popup Console:**
1. Right-click the extension icon
2. Select "Inspect popup"
3. Check Console tab for errors

**Content Script Console:**
1. Open the page (cairogyms.com)
2. Press F12 (DevTools)
3. Check Console for "PAGE_CONTEXT" messages

### 4. Manually Trigger Recommendations

Open the popup console and run:
```javascript
chrome.runtime.sendMessage({
  type: 'PAGE_CONTEXT',
  hostname: 'cairogyms.com',
  url: location.href,
  isCheckout: false
});
```

### 5. Check Extension Storage

In any console, run:
```javascript
// Check if token exists
chrome.storage.sync.get(['accessToken', 'apiBase'], (result) => {
  console.log('Storage:', result);
});
```

### 6. Set API Base (if not set)

Go to extension Options page:
- Right-click extension icon → Options
- Set API Base: `http://localhost:8000`
- Save

### 7. Get Auth Token from Web App

1. Open `http://localhost:5173` and login
2. Open DevTools → Application → Local Storage
3. Find the `accessToken`
4. In extension console, run:
```javascript
chrome.storage.sync.set({
  accessToken: 'YOUR_TOKEN_HERE',
  apiBase: 'http://localhost:8000'
});
```

## Common Issues

### "No perks detected"
- Backend returned empty recommendations array
- This is normal for domains with no relevant perks

### Blank popup
- Service worker hasn't received PAGE_CONTEXT yet
- Content script not injected
- Extension just installed (reload the page)

### "Error: 401"
- Not authenticated
- Token expired
- Set token manually (see step 7)

### "Error: 500"
- Backend error
- Check backend logs
- API endpoint might have failed

## Testing Flow

1. ✅ Backend running on port 8000
2. ✅ Logged in to web app
3. ✅ Extension installed and token set
4. ✅ Visit a page (e.g., cairogyms.com)
5. ✅ Content script sends PAGE_CONTEXT
6. ✅ Service worker fetches recommendations
7. ✅ Popup displays results

## Quick Fix Script

Run this in the page console after logging in:
```javascript
// Get token from localStorage (if web app stores it there)
const token = localStorage.getItem('accessToken');

// Store in extension
chrome.storage.sync.set({
  accessToken: token,
  apiBase: 'http://localhost:8000'
}, () => {
  console.log('✅ Token set! Reload this page.');
  location.reload();
});
```

