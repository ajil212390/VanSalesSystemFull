import { create } from 'zustand';
import { apiClient, setAccessToken } from '../api/client';
import type { User, AuthResponse } from '../types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (data: AuthResponse) => void;
  loadSession: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (data: AuthResponse) => {
    setAccessToken(data.access);
    localStorage.setItem('rf_refresh_token', data.refresh);
    set({
      user: data.user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  loadSession: async () => {
    const refreshToken = localStorage.getItem('rf_refresh_token');
    if (!refreshToken) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      // 1. Get new access token using refresh token
      const refreshRes = await apiClient.post('/auth/refresh/', {
        refresh: refreshToken,
      });
      const newAccessToken = refreshRes.data.access;
      setAccessToken(newAccessToken);

      // 2. Fetch current user info
      const meRes = await apiClient.get<User>('/auth/me/');
      set({
        user: meRes.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('rf_refresh_token');
      setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('rf_refresh_token');
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));

// Cross-tab logout synchronization
window.addEventListener('storage', (event) => {
  if (event.key === 'rf_refresh_token' && !event.newValue) {
    useAuthStore.getState().logout();
  }
});

// Session expired event from Axios interceptor
window.addEventListener('auth:session_expired', () => {
  useAuthStore.getState().logout();
});
