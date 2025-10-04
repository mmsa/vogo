# 🎯 Cursor/VS Code Setup Guide

Complete VS Code/Cursor configuration for Vogo development.

## 🚀 Quick Start

### Method 1: Run Everything with One Click

1. Open the **Run and Debug** panel (`Cmd+Shift+D`)
2. Select **"🎉 Vogo Full Stack"** from the dropdown
3. Click the green play button ▶️

This will:
- ✅ Start the database (if not running)
- ✅ Start the FastAPI backend at http://localhost:8000
- ✅ Start the React frontend at http://localhost:5173

### Method 2: Use Tasks

Press `Cmd+Shift+P` and type "Run Task":

**Initial Setup:**
- **Setup Full Project** - Complete one-time setup (database, dependencies, migrations, seed)

**Day-to-Day:**
- **Start Database** - Start PostgreSQL
- **Backend: Run Server** - Start FastAPI backend
- **Frontend: Run Dev Server** - Start React frontend
- **Seed Database** - Load sample data
- **Run Migrations** - Apply database schema changes

**Maintenance:**
- **Stop Database** - Stop PostgreSQL
- **Reset Database** - Wipe and restart database
- **Install Backend/Frontend Dependencies** - Update dependencies

## 🐛 Debug Configurations

### Available Launch Configurations:

1. **🚀 Backend (FastAPI)**
   - Runs FastAPI with debugger attached
   - Set breakpoints in Python code
   - Auto-reloads on file changes

2. **🌐 Frontend (Vite)**
   - Runs Vite dev server
   - Opens browser automatically when ready

3. **🗄️ Seed Database**
   - Debug the seed script
   - Useful for troubleshooting seed data

4. **🔄 Run Migrations**
   - Debug Alembic migrations
   - Step through migration scripts

5. **🎉 Vogo Full Stack** (Compound)
   - Runs backend + frontend together
   - Best for full-stack development

## 📝 How to Use

### Running the Full Stack:

1. **First Time Setup:**
   ```
   Cmd+Shift+P → Tasks: Run Task → "Setup Full Project"
   ```
   This takes ~2 minutes and sets up everything.

2. **Daily Development:**
   ```
   Cmd+Shift+D → Select "🎉 Vogo Full Stack" → Press F5
   ```

3. **Access Your App:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Debugging Python Code:

1. Open a Python file in `backend/`
2. Set breakpoints (click left of line numbers)
3. Press `F5` or select **"🚀 Backend (FastAPI)"**
4. Make API requests - execution will pause at breakpoints

### Debugging the Seed Script:

1. Select **"🗄️ Seed Database"** configuration
2. Set breakpoints in `backend/ops/seed.py`
3. Press `F5`
4. Step through the seeding process

## 🔧 Useful Commands

### Terminal Commands (built into tasks):

| Task | What it does |
|------|--------------|
| `Setup Full Project` | Complete initial setup |
| `Start Database` | Start PostgreSQL in Docker |
| `Stop Database` | Stop PostgreSQL |
| `Reset Database` | Delete all data and restart |
| `Run Migrations` | Apply database migrations |
| `Seed Database` | Load sample data |
| `Backend: Run Server` | Start FastAPI (background) |
| `Frontend: Run Dev Server` | Start Vite (background) |

### Keyboard Shortcuts:

- `F5` - Start debugging (selected configuration)
- `Shift+F5` - Stop debugging
- `Cmd+Shift+D` - Open Run & Debug panel
- `Cmd+Shift+P` - Command palette (access tasks)
- `Ctrl+C` - Stop running task in terminal

## 🎨 Editor Settings Included

The `.vscode/settings.json` includes:

- ✅ Python virtual environment auto-activation
- ✅ Auto-formatting on save (Black for Python, Prettier for TS/JS)
- ✅ Type checking enabled
- ✅ Import organization
- ✅ Tailwind CSS IntelliSense support
- ✅ Filtered file explorer (hides `__pycache__`, `node_modules`)

## 📦 Recommended Extensions

The following extensions are recommended (see `.vscode/extensions.json`):

- **Python** - Python language support
- **Pylance** - Fast Python language server
- **Black Formatter** - Python code formatting
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting for web files
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **Docker** - Docker container management

Install them by opening the Extensions panel (`Cmd+Shift+X`) and searching for "@recommended".

## 🔍 Troubleshooting

### Backend won't start?

1. Check if database is running:
   ```
   Run Task → "Start Database"
   ```

2. Check if dependencies are installed:
   ```
   Run Task → "Install Backend Dependencies"
   ```

3. Check if migrations are applied:
   ```
   Run Task → "Run Migrations"
   ```

### Frontend won't start?

1. Install dependencies:
   ```
   Run Task → "Install Frontend Dependencies"
   ```

2. Check for port conflicts (5173):
   ```
   lsof -ti:5173 | xargs kill -9
   ```

### Database connection issues?

1. Reset the database:
   ```
   Run Task → "Reset Database"
   ```

2. Wait 10 seconds for PostgreSQL to be ready

3. Re-run migrations and seed:
   ```
   Run Task → "Run Migrations"
   Run Task → "Seed Database"
   ```

## 🎯 Pro Tips

1. **Use the compound configuration** for full-stack development - it runs both backend and frontend together

2. **Set breakpoints liberally** - they're great for understanding code flow

3. **Use the integrated terminal** - tasks run in Cursor's terminal for easy access

4. **Watch for auto-reload** - both backend and frontend auto-reload on file changes

5. **Check the Debug Console** - see logs and output while debugging

6. **Use tasks for repetitive operations** - they're faster than typing commands

7. **Keep Docker Desktop running** - required for the database

## 📚 Additional Resources

- FastAPI Docs: https://fastapi.tiangolo.com/
- React Docs: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/
- SQLAlchemy: https://docs.sqlalchemy.org/
- Vite: https://vite.dev/

---

Happy coding! 🚀

