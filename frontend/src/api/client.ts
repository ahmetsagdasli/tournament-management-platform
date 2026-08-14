import axios, { AxiosError } from 'axios';

import type { ApiError } from '../types/api';

export const TOKEN_STORAGE_KEY = 'tournament_token';

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
});

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

    if (apiError.code === 'UNAUTHORIZED') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      unauthorizedListeners.forEach((listener) => listener());
    }

    return Promise.reject(apiError);
  },
);

function normalizeApiError(error: AxiosError<{ error?: ApiError }>): ApiError {
  const responseError = error.response?.data?.error;

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

  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server',
      details: [],
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    details: [],
  };
}
