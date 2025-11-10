/**
 * Authentication store using Zustand
 * Manages user authentication state, tokens, and auth actions
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  loadUser: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
        
        // Load user profile after login
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (response.ok) {
            const user = await response.json();
            set({ user, isAuthenticated: true });
          }
        } catch (error) {
          console.error('Failed to load user:', error);
        }
      },

      logout: () => {
        const { refreshToken } = get();
        
        // Revoke refresh token on server
        if (refreshToken) {
          fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().accessToken}`,
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }).catch(console.error);
        }
        
        // Clear local state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },

      loadUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;

        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            const user = await response.json();
            set({ user, isAuthenticated: true });
          } else if (response.status === 401) {
            // Token expired, try to refresh
            const newToken = await get().refreshAccessToken();
            if (newToken) {
              await get().loadUser(); // Retry with new token
            } else {
              get().logout();
            }
          }
        } catch (error) {
          console.error('Failed to load user:', error);
          get().logout();
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return null;

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (response.ok) {
            const data = await response.json();
            set({
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
            });
            return data.access_token;
          } else {
            get().logout();
            return null;
          }
        } catch (error) {
          console.error('Failed to refresh token:', error);
          get().logout();
          return null;
        }
      },
    }),
    {
      name: 'vogoplus-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);

