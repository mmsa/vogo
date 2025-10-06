import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, user, loadUser } = useAuth();
  const location = useLocation();

  // Load user data if we have a token but no user
  useEffect(() => {
    const authData = localStorage.getItem('vogplus-auth');
    const hasToken = authData ? JSON.parse(authData).state?.accessToken : null;
    
    if (hasToken && !user) {
      loadUser();
    }
  }, [user, loadUser]);

  // Still loading
  if (!isAuthenticated && !user) {
    const authData = localStorage.getItem('vogplus-auth');
    const hasToken = authData ? JSON.parse(authData).state?.accessToken : null;
    
    if (hasToken) {
      // We have a token but user isn't loaded yet
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
          </div>
        </div>
      );
    }
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin required but user is not admin
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

