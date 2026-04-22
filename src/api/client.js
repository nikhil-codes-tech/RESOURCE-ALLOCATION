// ─────────────────────────────────────────────────────────
// NG😊NE — Axios API Client with JWT Interceptors
// ─────────────────────────────────────────────────────────
import axios from 'axios';

// In dev, Vite proxy forwards /api → localhost:5000
// In prod, VITE_API_URL = https://ngone-api.up.railway.app/api
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT ──────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ngone_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: unwrap data + auto-refresh ─────
api.interceptors.response.use(
  (response) => {
    // Backend wraps in { success, data, message } — unwrap
    const body = response.data;
    if (body && typeof body === 'object' && 'data' in body) {
      response.data = body.data;
    }
    return response;
  },
  async (error) => {
    const original = error.config;

    // Auto-refresh on 401 (one retry)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('ngone_refresh');
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${baseURL}/auth/refresh`,
            { refreshToken: refresh }
          );
          const newToken = data?.data?.accessToken || data?.accessToken;
          if (newToken) {
            localStorage.setItem('ngone_token', newToken);
            original.headers.Authorization = `Bearer ${newToken}`;
            return api(original);
          }
        } catch {
          // Refresh failed — clear tokens
          localStorage.removeItem('ngone_token');
          localStorage.removeItem('ngone_refresh');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
