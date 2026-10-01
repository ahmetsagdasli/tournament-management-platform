// The single axios instance every api/services.ts function goes through.
// Centralizes three cross-cutting concerns so individual API calls don't
// have to think about them: attaching the auth token, normalizing errors
// into the app's ApiError shape, and reacting when the token turns out to
// be invalid/expired.
import axios, { AxiosError } from 'axios';

import type { ApiError } from '../types/api';

export const TOKEN_STORAGE_KEY = 'tournament_token';

type UnauthorizedListener = () => void;

// A tiny pub/sub so modules outside this file (namely AuthContext) can find
// out when the backend rejects a request as UNAUTHORIZED — e.g. because the
// JWT expired mid-session. This file has no React state of its own, so it
// cannot clear the logged-in user directly; it just notifies whoever is
// listening. Without this, the token would be removed from storage here but
// the app's in-memory `user` would keep showing the old session until the
// next page load.
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
});

// Attaches the stored token to every outgoing request, if one exists.
// Public endpoints (e.g. GET /api/tournaments) simply ignore the header;
// the backend only checks it on routes behind `authenticate`.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: ApiError }>) => {
    const apiError = normalizeApiError(error);

    // UNAUTHORIZED only ever comes from the `authenticate` middleware
    // (missing/invalid/expired token) — a wrong password on /login returns
    // INVALID_CREDENTIALS instead, so this never fires on a normal failed
    // login attempt.
    if (apiError.code === 'UNAUTHORIZED') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      unauthorizedListeners.forEach((listener) => listener());
    }

    // Every caller (via useApi, or a page's own try/catch) receives the
    // normalized ApiError directly, never a raw AxiosError.
    return Promise.reject(apiError);
  },
);

// Converts whatever axios/the backend gave us into the app's stable
// ApiError shape, so every consumer can rely on `error.code`/`.message`/
// `.details` always being present.
function normalizeApiError(error: AxiosError<{ error?: ApiError }>): ApiError {
  const responseError = error.response?.data?.error;

  // The common case: the backend responded with the standard
  // `{ error: { code, message, details } }` envelope (see errorHandler.ts).
  if (
    responseError &&
    typeof responseError.code === 'string' &&
    typeof responseError.message === 'string'
  ) {
    return {
      code: responseError.code,
      message: responseError.message,
      details: Array.isArray(responseError.details) ? responseError.details : [],
    };
  }

  // No response at all means the request never reached the server (backend
  // down, CORS rejection, offline, etc.) rather than the server responding
  // with an error.
  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server',
      details: [],
    };
  }

  // A response came back but didn't match the expected envelope shape
  // (e.g. a proxy error page) — fall back to a generic message rather than
  // showing the user something malformed.
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    details: [],
  };
}
