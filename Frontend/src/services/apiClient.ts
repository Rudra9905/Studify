import axios from 'axios';
import { useAuthContext } from '../context/AuthContext';

const normalizeBaseUrl = (url: string) => {
  if (!url) return '/api';
  const trimmed = url.trim();
  if (!trimmed) return '/api';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL ?? '/api');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// attach token on each request
apiClient.interceptors.request.use((config) => {
  const stored = localStorage.getItem('smart-classroom-auth');
  if (stored) {
    try {
      const { token } = JSON.parse(stored) as { token: string };
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

// Optional hook-based helper for components if needed
export const useApiClient = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = useAuthContext();
  return apiClient;
};
