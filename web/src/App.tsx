import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ThemeProvider } from "./hooks/use-theme";
import { useAuth } from "./store/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppHeader } from "./components/AppHeader";
import { AppShell } from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Memberships from "./pages/Memberships";
import MembershipBenefits from "./pages/MembershipBenefits";
import Benefits from "./pages/Benefits";
import Recommendations from "./pages/Recommendations";
import MyPerks from "./pages/MyPerks";
import Admin from "./pages/Admin";
import DebugInfo from "./pages/DebugInfo";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Privacy from "./pages/Privacy";

function App() {
  const { loadUser, isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Load user on app start if we have a token
  useEffect(() => {
    // Migrate from old key if needed
    const oldAuthData = localStorage.getItem("vogplus-auth");
    if (oldAuthData) {
      localStorage.setItem("vogoplus-auth", oldAuthData);
      localStorage.removeItem("vogplus-auth");
    }
    const authData = localStorage.getItem("vogoplus-auth");
    const hasToken = authData ? JSON.parse(authData).state?.accessToken : null;

    if (hasToken && !isAuthenticated) {
      loadUser();
    }
  }, []);

  // Listen for storage changes from other tabs (multi-tab support)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Watch for changes to the auth storage key
      if (e.key === "vogoplus-auth") {
        const newAuthData = e.newValue;
        const oldAuthData = e.oldValue;

        // Parse auth data to check user ID
        let newUserId: number | null = null;
        let oldUserId: number | null = null;

        try {
          if (newAuthData) {
            const parsed = JSON.parse(newAuthData);
            newUserId = parsed.state?.user?.id || null;
          }
          if (oldAuthData) {
            const parsed = JSON.parse(oldAuthData);
            oldUserId = parsed.state?.user?.id || null;
          }
        } catch (e) {
          // Ignore parse errors
        }

        // If user logged out (newUserId is null but oldUserId wasn't)
        // OR if user changed (newUserId !== oldUserId and both are not null)
        if (
          (!newUserId && oldUserId) ||
          (newUserId && oldUserId && newUserId !== oldUserId)
        ) {
          // Clear user-specific caches when user logs out or changes in another tab
          localStorage.removeItem("vogo_cache_ai");
          localStorage.removeItem("vogo_cache_rule");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Also watch for user changes in the current tab and clear cache if user ID changes
  useEffect(() => {
    const cachedAI = localStorage.getItem("vogo_cache_ai");
    if (cachedAI && user?.id) {
      try {
        const cached = JSON.parse(cachedAI);
        // If cache exists but belongs to a different user, clear it
        if (cached.userId && cached.userId !== user.id) {
          localStorage.removeItem("vogo_cache_ai");
          localStorage.removeItem("vogo_cache_rule");
        }
      } catch (e) {
        // Ignore parse errors
      }
    } else if (!user?.id && cachedAI) {
      // User logged out, clear cache
      localStorage.removeItem("vogo_cache_ai");
      localStorage.removeItem("vogo_cache_rule");
    }
  }, [user?.id]);

  // Auth routes (public)
  if (
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/privacy"
  ) {
    return (
      <ThemeProvider>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <Register />
            }
          />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // Protected routes (require authentication)
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors">
        <ProtectedRoute>
          <AppHeader />
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/memberships" element={<Memberships />} />
              <Route path="/memberships/:id" element={<MembershipBenefits />} />
              <Route path="/benefits" element={<Benefits />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/my-perks" element={<MyPerks />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/debug" element={<DebugInfo />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      </div>
    </ThemeProvider>
  );
}

export default App;
