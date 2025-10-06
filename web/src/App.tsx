import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ThemeProvider } from "./hooks/use-theme";
import { useAuth } from "./store/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppHeader } from "./components/AppHeader";
import { AppShell } from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Memberships from "./pages/Memberships";
import Benefits from "./pages/Benefits";
import Recommendations from "./pages/Recommendations";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

function App() {
  const { loadUser, isAuthenticated } = useAuth();
  const location = useLocation();

  // Load user on app start if we have a token
  useEffect(() => {
    const authData = localStorage.getItem('vogplus-auth');
    const hasToken = authData ? JSON.parse(authData).state?.accessToken : null;
    
    if (hasToken && !isAuthenticated) {
      loadUser();
    }
  }, []);

  // Auth routes (public)
  if (location.pathname === '/login' || location.pathname === '/register') {
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Register />
          } />
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
              <Route path="/benefits" element={<Benefits />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </ProtectedRoute>
      </div>
    </ThemeProvider>
  );
}

export default App;
