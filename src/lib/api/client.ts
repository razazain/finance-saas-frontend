import axios from 'axios';

/**
 * Central HTTP client for Phase 3. Page components intentionally do not use it
 * during Phase 2, when all state is local demo data.
 *
 * During API integration, add access-token attachment and a single-flight 401
 * refresh interceptor here. The refresh token must remain in the backend's
 * HttpOnly cookie and must never be read by browser JavaScript.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: { Accept: 'application/json' },
  timeout: 30_000,
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (error.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
    if (!error.response) return 'Unable to reach the server. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
