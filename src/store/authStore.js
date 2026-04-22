// ─────────────────────────────────────────────────────────
// NG😊NE — Zustand Auth Store
// ─────────────────────────────────────────────────────────
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as loginApi, logout as logoutApi, getMe } from '../api/auth.api.js';
import { connectSocket, disconnectSocket } from '../socket/index.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      /**
       * Login with email/password credentials
       */
      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const { data } = await loginApi(credentials);
          const token = data?.accessToken || data?.token;
          const refresh = data?.refreshToken;
          const user = data?.user;

          if (token) {
            localStorage.setItem('ngone_token', token);
            if (refresh) localStorage.setItem('ngone_refresh', refresh);
          }

          set({
            user: user || null,
            accessToken: token || null,
            refreshToken: refresh || null,
            isAuthenticated: true,
            isLoading: false,
          });

          // Connect socket with auth
          if (token) connectSocket(token);

          return { user, token };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      /**
       * Logout — clear everything
       */
      logout: async () => {
        try {
          await logoutApi();
        } catch {
          // Ignore logout API errors
        }
        localStorage.removeItem('ngone_token');
        localStorage.removeItem('ngone_refresh');
        disconnectSocket();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      /**
       * Fetch current user from /auth/me
       */
      fetchUser: async () => {
        const token = localStorage.getItem('ngone_token');
        if (!token) return null;

        try {
          const { data } = await getMe();
          const user = data?.user || data;
          set({ user, isAuthenticated: true, accessToken: token });
          return user;
        } catch {
          // Token invalid
          localStorage.removeItem('ngone_token');
          localStorage.removeItem('ngone_refresh');
          set({ user: null, isAuthenticated: false, accessToken: null });
          return null;
        }
      },

      /**
       * Set user directly (for demo/social login)
       */
      setUser: (user) =>
        set({ user, isAuthenticated: !!user }),

      /**
       * Set tokens directly
       */
      setTokens: (accessToken, refreshToken) => {
        if (accessToken) localStorage.setItem('ngone_token', accessToken);
        if (refreshToken) localStorage.setItem('ngone_refresh', refreshToken);
        set({ accessToken, refreshToken });
      },
    }),
    {
      name: 'ngone-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
