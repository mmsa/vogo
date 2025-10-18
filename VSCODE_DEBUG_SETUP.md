# VS Code Debugging Setup for VogPlus

The `.vscode` folder is git-ignored, but here are the recommended debug configurations for the full-stack VogPlus project including the Chrome extension.

## launch.json

Add these configurations to your `.vscode/launch.json`:

### Chrome Extension Debug Configurations

```json
{
  "name": "🧩 Chrome Extension",
  "type": "chrome",
  "request": "launch",
  "url": "chrome://extensions",
  "webRoot": "${workspaceFolder}/webext/src",
  "runtimeArgs": [
    "--disable-extensions-except=${workspaceFolder}/webext/dist",
    "--load-extension=${workspaceFolder}/webext/dist"
  ],
  "preLaunchTask": "Build Chrome Extension",
  "presentation": {
    "group": "vogo",
    "order": 3
  }
}
```

```json
{
  "name": "🔍 Debug Extension (Attach)",
  "type": "chrome",
  "request": "attach",
  "port": 9222,
  "webRoot": "${workspaceFolder}/webext/src",
  "urlFilter": "chrome-extension://*",
  "presentation": {
    "group": "vogo",
    "order": 4
  }
}
```

### Compound Configuration (Full Stack + Extension)

```json
{
  "name": "🚀 Full Stack + Extension",
  "configurations": [
    "🚀 Backend (FastAPI)",
    "🌐 Frontend (Vite)",
    "🧩 Chrome Extension"
  ],
  "presentation": {
    "hidden": false,
    "group": "vogo",
    "order": 2
  },
  "stopAll": true
}
```

## tasks.json

Add these tasks to your `.vscode/tasks.json`:

### Extension Build Task

```json
{
  "label": "Build Chrome Extension",
  "type": "shell",
  "command": "${workspaceFolder}/webext/build.sh",
  "options": {
    "cwd": "${workspaceFolder}/webext"
  },
  "presentation": {
    "echo": true,
    "reveal": "silent",
    "focus": false,
    "panel": "shared",
    "showReuseMessage": false,
    "clear": false
  },
  "problemMatcher": []
}
```

### Extension Install Dependencies

```json
{
  "label": "Install Extension Dependencies",
  "type": "shell",
  "command": "npm install",
  "options": {
    "cwd": "${workspaceFolder}/webext"
  },
  "presentation": {
    "echo": true,
    "reveal": "always",
    "focus": false,
    "panel": "shared"
  },
  "problemMatcher": []
}
```

### Extension Watch Mode

```json
{
  "label": "Extension: Watch Mode",
  "type": "shell",
  "command": "npm run dev",
  "options": {
    "cwd": "${workspaceFolder}/webext"
  },
  "presentation": {
    "echo": true,
    "reveal": "always",
    "focus": false,
    "panel": "dedicated",
    "group": "vogo"
  },
  "isBackground": true,
  "problemMatcher": {
    "pattern": {
      "regexp": "^$",
      "file": 1,
      "location": 2,
      "message": 3
    },
    "background": {
      "activeOnStart": true,
      "beginsPattern": "building",
      "endsPattern": "built in"
    }
  }
}
```

## How to Use

### Debug Single Extension
1. Press `F5` or go to Run & Debug sidebar
2. Select "🧩 Chrome Extension"
3. Click Run - Chrome will launch with extension loaded
4. Set breakpoints in your TypeScript files
5. Extension will auto-rebuild before launching

### Debug Full Stack + Extension
1. Select "🚀 Full Stack + Extension" from debug dropdown
2. Click Run - Launches backend, frontend, AND extension together
3. All three components running and debuggable
4. Set breakpoints anywhere

### Attach to Running Extension
1. Start Chrome with remote debugging:
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
   ```
2. Load your extension manually
3. Select "🔍 Debug Extension (Attach)"
4. Click Run - Attaches debugger to running extension

## Available Debug Configurations

After setup, you'll have these options in VS Code:

- 🚀 **Backend (FastAPI)** - Debug Python backend
- 🌐 **Frontend (Vite)** - Debug React frontend
- 🧩 **Chrome Extension** - Debug extension with auto-build
- 🔍 **Debug Extension (Attach)** - Attach to running extension
- 🗄️ **Seed Database** - Debug seed script
- 🔄 **Run Migrations** - Debug Alembic migrations
- 🎉 **Vogo Full Stack** - Backend + Frontend together
- 🚀 **Full Stack + Extension** - Everything at once!

## Breakpoint Locations

You can set breakpoints in:

### Backend
- `/backend/app/api/*.py` - API endpoints
- `/backend/app/services/*.py` - Business logic
- `/backend/app/models/*.py` - Database models

### Frontend
- `/web/src/pages/*.tsx` - React pages
- `/web/src/components/*.tsx` - React components
- `/web/src/lib/*.ts` - Utilities and API calls

### Extension
- `/webext/src/popup/Popup.tsx` - Popup UI logic
- `/webext/src/bg/serviceWorker.ts` - Background service worker
- `/webext/src/content/detector.ts` - Content script
- `/webext/src/lib/*.ts` - Shared utilities

## Tips

1. **Source Maps**: All TypeScript/Python files have source maps, so you can debug the original code
2. **Hot Reload**: Frontend and Extension watch modes auto-rebuild on changes
3. **Console Logs**: 
   - Backend logs in VS Code terminal
   - Frontend logs in browser console
   - Extension logs in `chrome://extensions` → Service Worker console
4. **Network Tab**: Use Chrome DevTools Network tab to inspect API calls
5. **Storage Inspector**: Check `chrome.storage` in Extension's DevTools

## Prerequisites

1. Install VS Code extensions:
   - **Python** (ms-python.python)
   - **Debugger for Chrome** (msjsdiag.debugger-for-chrome) or **JavaScript Debugger** (built-in)
   - **TypeScript** (built-in)

2. Ensure all dependencies are installed:
   ```bash
   # Run the full setup task in VS Code
   # Terminal → Run Task → "Setup Full Project"
   ```

## Troubleshooting

### Extension won't launch
- Ensure extension is built: Run task "Build Chrome Extension"
- Check `webext/dist/` folder exists and has manifest.json
- Try loading manually in `chrome://extensions` first

### Breakpoints not hitting
- Check source maps are enabled
- Ensure you're debugging the right file (TypeScript source, not compiled JS)
- Verify Chrome DevTools is set to "Enable JavaScript source maps"

### Port conflicts
- Backend: 8000 (change in launch config if needed)
- Frontend: 5173 (Vite default, auto-increments if busy)
- Chrome Debug: 9222 (for attach mode)

## Full Setup Example

1. Copy configurations above to your `.vscode/launch.json` and `.vscode/tasks.json`
2. Run task: "Setup Full Project" (installs all dependencies)
3. Select debug config: "🚀 Full Stack + Extension"
4. Press F5
5. Wait for all three to start
6. Set breakpoints anywhere
7. Start debugging!

Enjoy seamless full-stack + extension debugging! 🎉

