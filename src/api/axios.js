import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // sends httpOnly cookies automatically
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Refresh access token via httpOnly cookie.
 * The backend sets the new access_token cookie automatically.
 */
export const refreshAccessToken = async () => {
  await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
};

// ─── Response interceptor: auto-refresh on 401 ─────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (!error) prom.resolve();
    else prom.reject(error);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || '');
    const isAuthRoute = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email', '/auth/me']
      .some((path) => requestUrl.includes(path));
    const isAdminRoute = requestUrl.includes('/admin/');

    if (error.response?.status === 401 && !isAuthRoute && !isAdminRoute && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await refreshAccessToken();
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        window.location.href = '/login/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
