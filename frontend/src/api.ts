import axios from 'axios';

const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim();
// Ignore localhost URLs in production builds (common misconfiguration on Vercel).
export const API_BASE =
  import.meta.env.PROD && /localhost|127\.0\.0\.1/i.test(configuredApiUrl)
    ? ''
    : configuredApiUrl;

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    const data = error.response?.data;
    if (typeof data === 'object' && data?.error) {
      return data.error;
    }
    if (error.response?.status === 503) {
      return 'Server is temporarily unavailable. Please try again later.';
    }
    if (!error.response) {
      return 'Cannot reach the server. Check your connection or try again later.';
    }
  }

  return fallback;
}

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
