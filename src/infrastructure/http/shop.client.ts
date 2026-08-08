import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { ENV } from '@/config/env';
import { tokenManager } from '@/infrastructure/auth/tokenManager';

const shopClient = axios.create({
  baseURL: ENV.VITE_SHOP_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token
shopClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getShopToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 and normalize responses
shopClient.interceptors.response.use(
  (response) => {
    // Le backend répond systématiquement { success, message, data }. On rend
    // directement `data` : les appelants manipulent la charge utile, jamais
    // l'enveloppe. Une réponse hors convention est renvoyée telle quelle.
    const corps = response.data;
    if (corps && typeof corps === 'object' && 'success' in corps && 'data' in corps) {
      const donnees = corps.data;
      // L'admin affiche les messages renvoyés par le backend, pas du texte
      // codé en dur. On attache `message` à la donnée résolue en propriété
      // non-énumérable : invisible dans un spread / JSON / tableau, mais lue
      // par shared/utils/alert.ts au moment d'afficher une notification.
      if (donnees && typeof donnees === 'object' && !Array.isArray(donnees) && corps.message) {
        Object.defineProperty(donnees, '_message', {
          value: corps.message,
          writable: true,
          configurable: true,
          enumerable: false,
        });
      }
      return donnees;
    }
    return corps;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token — le backend attend { refreshToken } dans le body
        const refreshToken = tokenManager.getShopRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${ENV.VITE_SHOP_API_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );

        // Réponse : { success, message, data: { token, refreshToken } }
        const newToken = response.data?.data?.token;
        const newRefreshToken = response.data?.data?.refreshToken;
        tokenManager.setShopToken(newToken);
        if (newRefreshToken) {
          tokenManager.setShopRefreshToken(newRefreshToken);
        }

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return shopClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        tokenManager.clearAll();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Return error with normalized message
    const message =
      (error.response?.data as any)?.message || error.message || 'An error occurred';
    return Promise.reject({
      status: error.response?.status,
      message,
      data: error.response?.data,
    });
  }
);

/**
 * L'intercepteur fait résoudre les appels sur la charge utile, pas sur
 * `AxiosResponse`. Le type exporté le reflète, sans quoi chaque appelant
 * croirait manipuler une réponse axios et lirait `.data` en trop.
 */
type ClientDeballe = {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
};

export default shopClient as unknown as ClientDeballe;
