import axios, { AxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types/api';
import { TokenResponseDto } from '../types/auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ── Request interceptor: adjunta el access token si existe ──────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: renueva el token ante un 401 ─────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processPendingQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    const is401 = error.response?.status === 401;
    const alreadyRetried = originalRequest._retry;
    const isRefreshEndpoint = originalRequest.url?.includes('/api/auth/refreshToken');

    if (!is401 || alreadyRetried || isRefreshEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${token}`,
        };
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post<ApiResponse<TokenResponseDto>>(
        `${import.meta.env.VITE_API_URL}/api/auth/refreshToken`,
        { refreshToken },
      );

      if (!data.result || !data.data) throw new Error('Refresh failed');

      const { accessToken, refreshToken: newRefreshToken } = data.data;
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);

      apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      processPendingQueue(null, accessToken);

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${accessToken}`,
      };
      return apiClient(originalRequest);
    } catch (refreshError) {
      processPendingQueue(refreshError, null);
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

function clearSessionAndRedirect() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.location.href = '/login';
}
