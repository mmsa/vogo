# Vogo Frontend Quick Start

## 🚀 Get Started in 3 Steps

### 1️⃣ Install Node.js
Download and install from: **https://nodejs.org/** (choose LTS version)

Verify installation:
```bash
node --version  # Should show v18 or higher
npm --version   # Should show 9.x or higher
```

### 2️⃣ Install Dependencies
```bash
cd /Users/mmsa/Projects/vogo/web
npm install
```

This installs:
- React, React Router, TypeScript
- Lucide React (icons)
- Tailwind CSS utilities
- All UI components

### 3️⃣ Start the App
```bash
# Terminal 1: Start Backend
cd /Users/mmsa/Projects/vogo/backend
source ../.venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2: Start Frontend
cd /Users/mmsa/Projects/vogo/web
npm run dev
```

🎉 **Open browser**: http://localhost:5173

---

## 🎨 What's New

### Premium UI Components
- ✨ Animated stat cards
- 🌙 Dark mode toggle
- 🔍 Search and filters
- 📱 Fully responsive
- 🎯 Smooth transitions

### Redesigned Pages
1. **Dashboard**: Hero section, quick actions, recommendations preview
2. **Memberships**: Search, category filters, smart add warnings
3. **Benefits**: Collapsible accordions, sticky sidebar
4. **Recommendations**: Mode toggle (Rule-based ⟷ AI GPT-4o)

### Key Features
- Sticky navigation with icons
- Dark/Light mode (syncs with system)
- Loading skeletons
- Empty states with CTAs
- Hover effects and animations
- Accessible (keyboard navigation, focus rings)

---

## 🐛 Troubleshooting

**Port 5173 already in use?**
```bash
npm run dev -- --port 3000
```

**API not connecting?**
- Ensure backend is running on port 8000
- Check `vite.config.ts` proxy settings

**Dark mode not working?**
```bash
# Clear localStorage
localStorage.clear()
```

**Fresh install?**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📁 Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── ui/              # Base components
│   │   └── ...              # Feature components
│   ├── pages/               # Dashboard, Memberships, etc.
│   ├── hooks/               # Custom hooks (theme)
│   ├── lib/                 # API, utils, theme
│   └── App.tsx
├── package.json
└── tailwind.config.js
```

---

## 🎯 Next Steps

1. ✅ Install Node.js
2. ✅ Run `npm install`
3. ✅ Start backend and frontend
4. 🎨 Explore the new UI
5. 🌙 Try dark mode!

For detailed documentation, see:
- **SETUP.md** - Full setup guide
- **UI_UPGRADE_SUMMARY.md** - Complete feature list

---

**Happy coding! 🚀**

