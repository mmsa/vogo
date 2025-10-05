# Vogo Web Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

## Installation Steps

### 1. Install Dependencies

```bash
cd /Users/mmsa/Projects/vogo/web
npm install
```

This will install all required packages including:
- React & React DOM
- React Router
- Lucide React (icons)
- Framer Motion (animations)
- Tailwind CSS utilities (clsx, tailwind-merge)
- TypeScript

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at: http://localhost:5173

### 3. Backend Connection

Make sure the backend is running on port 5173 (Vite will proxy API calls):

```bash
# In a separate terminal
cd /Users/mmsa/Projects/vogo/backend
source ../.venv/bin/activate
uvicorn main:app --reload --port 8000
```

## Features Implemented

### Design System
- ✅ Brand colors: Primary (#5B4BFB), Accent (#22C55E)
- ✅ Dark mode support with localStorage persistence
- ✅ Custom animations (fade-in, slide-up, scale-in)
- ✅ Responsive design (mobile → desktop)

### Components
- ✅ Button (primary, secondary, ghost, outline variants)
- ✅ Card with shadow-card effects
- ✅ Badge (default, success, warning, secondary)
- ✅ Input with focus rings
- ✅ Dialog/Modal system
- ✅ Alert components
- ✅ Accordion for collapsible content
- ✅ Switch toggle
- ✅ Skeleton loaders

### Layout
- ✅ AppHeader with sticky navigation
- ✅ Dark mode toggle
- ✅ Responsive nav with icons (Dashboard, Memberships, Benefits, Recommendations)
- ✅ AppShell with max-width and gutters

### Pages

#### Dashboard
- ✅ Personalized greeting based on time of day
- ✅ Animated stat cards with icons
- ✅ Quick actions section
- ✅ Recent recommendations preview
- ✅ Empty state with CTA

#### Memberships
- ✅ Search functionality
- ✅ Category filters (banking, travel, mobile, retail, entertainment)
- ✅ Elevated cards with hover effects
- ✅ Add/Remove membership modal
- ✅ Smart check warnings with AI analysis
- ✅ Checkbox selection with visual feedback

#### Benefits
- ✅ Collapsible accordions by membership
- ✅ Benefit cards with vendor information
- ✅ Sticky sidebar with overview stats (XL+ screens)
- ✅ Empty state with CTA
- ✅ Category badges

#### Recommendations
- ✅ Mode toggle: Rule-based ⟷ AI (GPT-4o)
- ✅ Recommendation cards with savings badges
- ✅ "Why?" button for rationale
- ✅ Relevant benefits section (AI mode)
- ✅ Loading states with animations
- ✅ Empty state with CTA

### Accessibility
- ✅ Semantic HTML headings
- ✅ aria-labels for interactive elements
- ✅ Keyboard navigation support
- ✅ Focus rings on all interactive elements
- ✅ High contrast text
- ✅ Dark mode support

### Performance
- ✅ Code splitting with React Router
- ✅ Skeleton loaders for perceived performance
- ✅ Optimistic UI updates
- ✅ Cached API responses for instant toggle
- ✅ Staggered animations for smooth entry

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── ui/                   # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Alert.tsx
│   │   │   ├── Accordion.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── ModeToggle.tsx
│   │   ├── AppHeader.tsx         # Main navigation
│   │   ├── AppShell.tsx          # Layout wrapper
│   │   ├── StatCard.tsx          # Dashboard stat card
│   │   ├── SectionHeader.tsx     # Page section headers
│   │   ├── MembershipCard.tsx    # Membership display card
│   │   ├── BenefitCard.tsx       # Benefit display card
│   │   └── RecommendationCard.tsx # Recommendation card
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Memberships.tsx
│   │   ├── Benefits.tsx
│   │   └── Recommendations.tsx
│   ├── hooks/
│   │   └── use-theme.tsx         # Dark mode hook
│   ├── lib/
│   │   ├── api.ts                # API client
│   │   ├── theme.ts              # Design tokens
│   │   └── utils.ts              # Utility functions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Theme Customization

Edit `src/lib/theme.ts` to customize colors, radius, and shadows:

```typescript
export const theme = {
  colors: {
    primary: {
      DEFAULT: '#5B4BFB',  // Change primary color
      hover: '#4A3FE0',
    },
    // ...
  },
}
```

## Dark Mode

Dark mode is automatically enabled based on:
1. User preference (toggled via moon/sun icon)
2. System preference (prefers-color-scheme)
3. Persisted in localStorage

## Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## Troubleshooting

### Port already in use
If port 5173 is taken:
```bash
npm run dev -- --port 3000
```

### API connection issues
Ensure backend is running and accessible at http://localhost:8000

### Dark mode not working
Clear localStorage and refresh:
```javascript
localStorage.removeItem('vogo-theme')
```

## Next Steps

1. Install Node.js if not already installed
2. Run `npm install` in the web directory
3. Start the backend server
4. Run `npm run dev` to start the frontend
5. Navigate to http://localhost:5173

Enjoy the premium Vogo experience! 🚀

