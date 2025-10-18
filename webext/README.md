# VogPlus Chrome Extension

Chrome extension that detects when you're browsing and shows AI-powered membership benefit recommendations.

## Features

- 🔍 **Auto-Detection**: Detects checkout/cart pages and can auto-open recommendations
- 💡 **AI Recommendations**: Shows top 3 relevant recommendations for the current domain
- 💾 **Smart Caching**: 10-minute cache per domain to reduce API calls
- ⚙️ **Configurable**: Set your API base URL and preferences in Options
- 🚀 **Fast**: Service worker architecture for instant responses

## Installation

1. **Build the extension**:
   ```bash
   cd webext
   npm install
   npm run build
   ```

2. **Load in Chrome**:
   - Open `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `webext/dist` folder

3. **Configure**:
   - Right-click the extension icon → Options
   - Set API Base URL (defaults to `http://localhost:8000`)
   - Enable auto-open on checkout if desired

4. **Login**:
   - Login to VogPlus web app first
   - Extension will use the same authentication

## Usage

1. **Browse any website** - Extension automatically detects the domain
2. **Click extension icon** - See recommendations for that site
3. **Checkout detection** - Auto-opens on cart/checkout pages (if enabled)
4. **Take action** - Click "Take Action" to open recommendation links

## Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Create ZIP for distribution
npm run zip
```

## Architecture

- **Manifest V3**: Modern Chrome extension format
- **Service Worker**: Background script for API calls and caching
- **Content Script**: Detects page navigation and checkout pages
- **Popup**: Shows recommendations for current domain
- **Options**: Configure API endpoint and preferences

## API Integration

The extension connects to VogPlus backend endpoints:
- `POST /api/ai/recommendations` - Get recommendations for a domain
- `POST /api/ai/discover` - Discover new memberships
- `POST /api/auth/login` - Authentication (via web app)

## File Structure

```
webext/
├── src/
│   ├── popup/          # Extension popup UI
│   ├── options/        # Options page
│   ├── content/        # Content script (page detector)
│   ├── bg/            # Service worker (background logic)
│   └── lib/           # Shared utilities (auth, storage, api)
├── dist/              # Built extension (load this in Chrome)
├── manifest.json      # Extension manifest
└── package.json       # Dependencies
```

## Cache Strategy

- **Per-domain caching**: 10 minute TTL
- **Local storage**: Stored in `chrome.storage.local`
- **Auto-refresh**: Fetches fresh data after cache expires
- **Manual clear**: Use Options page to clear all cached data

## Permissions

- `storage` - Save settings and cache
- `activeTab` - Get current tab URL
- `tabs` - Open recommendation links
- `<all_urls>` - Detect domains and make API calls

## Troubleshooting

1. **No recommendations showing**:
   - Check if you're logged in to the web app
   - Verify API Base URL in Options
   - Check browser console for errors

2. **401 Authentication errors**:
   - Re-login through the web app
   - Extension shares web app authentication

3. **Cache not updating**:
   - Wait 10 minutes or clear cache in Options
   - Check network tab for API calls

## Contributing

This extension is part of the VogPlus project. See main repo README for contribution guidelines.

