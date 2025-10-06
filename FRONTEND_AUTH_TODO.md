# 🚧 Frontend Authentication - Not Yet Implemented

## Current State

**Problem**: You're "logged in straight away" because the frontend uses a **hardcoded user ID**:

```typescript
// web/src/lib/api.ts
export const CURRENT_USER_ID = 1;  // ❌ Hardcoded!
```

All pages (Dashboard, Memberships, Benefits, Recommendations) use this hardcoded ID to fetch data:
- `api.getUserBenefits(CURRENT_USER_ID)` 
- `api.getRecommendations(CURRENT_USER_ID)`
- etc.

## What Needs to Be Built

### 1. **Auth Store** (Zustand)
Create `web/src/store/auth.ts`:
- Store: `accessToken`, `refreshToken`, `user`
- Actions: `login()`, `logout()`, `refresh()`, `loadMe()`
- Persist tokens to `localStorage`

### 2. **Update API Client** 
Modify `web/src/lib/api.ts`:
- Add `Authorization: Bearer <token>` header to all requests
- Remove `CURRENT_USER_ID` constant
- Auto-refresh tokens on 401 errors
- Get user ID from auth store instead of hardcoded value

### 3. **Login Page**
Create `web/src/pages/auth/Login.tsx`:
- Email + password form
- Call `POST /api/auth/login`
- Store tokens in auth store
- Redirect to Dashboard

### 4. **Register Page**
Create `web/src/pages/auth/Register.tsx`:
- Email + password form (with confirmation)
- Call `POST /api/auth/register`
- Auto-login after registration
- Redirect to Dashboard

### 5. **Protected Routes**
Create `web/src/components/ProtectedRoute.tsx`:
- Check if user is authenticated (has token)
- If not → redirect to `/login`
- Wrap all existing routes

### 6. **Update App Router**
Modify `web/src/App.tsx`:
- Add routes: `/login`, `/register`
- Wrap all existing routes in `<ProtectedRoute>`
- Default route: redirect to `/login` if not authed, `/dashboard` if authed

### 7. **Update AppHeader**
Modify `web/src/components/AppHeader.tsx`:
- Show user email from `useAuth().user`
- Show role badge if admin
- Add dropdown menu with "Logout" button
- Add "Admin" nav link for admin users

### 8. **Admin Users Page** (Admin Only)
Create `web/src/pages/admin/Users.tsx`:
- Table of all users
- Search + pagination
- Edit role (user ⟷ admin)
- Deactivate/activate users
- Call `GET /api/admin/users`, `PATCH /api/admin/users/{id}`

### 9. **Update Existing Pages**
Replace all instances of `CURRENT_USER_ID` with `useAuth().user.id`:
- `Dashboard.tsx`
- `Memberships.tsx`
- `Benefits.tsx`
- `Recommendations.tsx`

## Dependencies to Install

```bash
cd web
npm install zustand jwt-decode react-hook-form zod @hookform/resolvers
```

## File Structure

```
web/src/
├── store/
│   └── auth.ts                 # Zustand auth store
├── pages/
│   ├── auth/
│   │   ├── Login.tsx           # Login page
│   │   └── Register.tsx        # Register page
│   ├── admin/
│   │   └── Users.tsx           # Admin user management
│   └── ... (existing pages)
├── components/
│   ├── ProtectedRoute.tsx      # Auth guard
│   └── ... (existing components)
└── lib/
    └── api.ts                  # Update with auth headers
```

## Effort Estimate

- **Auth Store**: 30 min
- **Update API Client**: 20 min
- **Login/Register Pages**: 1 hour
- **Protected Routes**: 20 min
- **Update App Router**: 15 min
- **Update AppHeader**: 30 min
- **Admin Users Page**: 1 hour
- **Update Existing Pages**: 30 min

**Total**: ~4 hours of development

## Quick Start (If You Want Me to Build It Now)

Just say:
- "Build the frontend auth" → I'll implement everything
- "Start with login page" → I'll build incrementally
- "Show me the auth store first" → I'll explain then build

Or you can build it yourself using this as a guide!

---

**Current Status**: 
- ✅ Backend: 100% complete (all endpoints working)
- ❌ Frontend: 0% (still using hardcoded user)

**Result**: You can test all backend auth APIs via curl/Postman, but the web UI has no login screen yet.

