import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || '';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    // Backend errors are { error: "..." } (a string). Platform errors (e.g. a
    // Vercel 500) can be an object like { error: { code, message } } — returning
    // a non-string here would crash React when rendered, so coerce to fallback.
    const apiError = (error.response?.data as { error?: unknown } | undefined)?.error;
    if (typeof apiError === 'string' && apiError.trim()) return apiError;
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
