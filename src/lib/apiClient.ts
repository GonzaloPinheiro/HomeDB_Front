import axios, { AxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types/api';
import { TokenResponseDto } from '../types/auth';
import { getActiveUrl } from './envConfig';

export const apiClient = axios.create({
  withCredentials: true,
});

// Token de acceso guardado en memoria para funcionar sobre HTTP (sin flag Secure en cookies).
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

// ── Request interceptor: URL base dinámica + Bearer token ────────────────────
apiClient.interceptors.request.use((config) => {
  config.baseURL = getActiveUrl();
  if (_accessToken) {
    config.headers['Authorization'] = `Bearer ${_accessToken}`;
  }
  return config;
});

// ── Response interceptor: renueva el token ante un 401 ─────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: () => void;
  reject: (err: unknown) => void;
}> = [];

function processPendingQueue(error: unknown) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    const is401 = error.response?.status === 401;
    const alreadyRetried = originalRequest._retry;
    const url = originalRequest.url ?? '';
    const isRefreshEndpoint = url.includes('/api/auth/refreshToken');
    const isUnauthenticatedEndpoint =
      url.includes('/api/auth/login') || url.includes('/api/auth/register');

    if (!is401 || alreadyRetried || isRefreshEndpoint || isUnauthenticatedEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then(() => apiClient(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // La cookie RefreshToken se envía automáticamente por el navegador.
      // Se pasa refreshToken vacío en el body para satisfacer el model binding;
      // el backend lo sobreescribe con la cookie si está presente.
      const { data } = await axios.post<ApiResponse<TokenResponseDto>>(
        `${getActiveUrl()}/api/auth/refreshToken`,
        { refreshToken: '' },
        { withCredentials: true },
      );

      if (!data.result || !data.data) throw new Error('Refresh failed');

      setAccessToken(data.data.accessToken);
      processPendingQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      processPendingQueue(refreshError);
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

function clearSessionAndRedirect() {
  window.location.href = '/auth';
}
