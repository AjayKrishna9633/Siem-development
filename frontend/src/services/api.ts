import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { IApiResponse, ILoginResponse } from '../types/auth.ts';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// The access token lives only in memory; the refresh token is an httpOnly cookie
let accessToken: string | null = null;
let onSessionChange: ((session: ILoginResponse | null) => void) | null = null;
let refreshInFlight: Promise<ILoginResponse | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setSessionListener = (listener: (session: ILoginResponse | null) => void) => {
  onSessionChange = listener;
};

// Single-flight: concurrent 401s (and StrictMode's double effects) share one
// refresh call, since a rotated refresh token is only valid once.
export const refreshSession = (): Promise<ILoginResponse | null> => {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post<IApiResponse<ILoginResponse>>('/auth/refresh')
      .then((res) => res.data.data)
      .catch(() => null)
      .then((session) => {
        setAccessToken(session?.accessToken ?? null);
        onSessionChange?.(session);
        return session;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Auth endpoints report bad credentials with 401 too; those must not trigger a refresh
const SKIP_REFRESH =
  /\/auth\/(login|refresh|logout|accept-invite|verify-otp|send-otp|reset-password)/;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !SKIP_REFRESH.test(original.url ?? '')
    ) {
      original._retried = true;
      const session = await refreshSession();
      if (session) {
        original.headers.Authorization = `Bearer ${session.accessToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);
