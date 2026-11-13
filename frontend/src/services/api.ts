import axios, { type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import type { IApiResponse } from '@/types/auth.ts';
import type { ILoginResponse } from '@/features/auth';
import { apiErrorMessage, shouldToast } from '@/lib/errors.ts';

const SESSION_EXPIRED = 'Your session expired. Sign in again.';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Request option for calls whose page shows the error itself: no global toast. */
export const INLINE_ERRORS = { skipGlobalError: true } as const;

let accessToken: string | null = null;
let onSessionChange: ((session: ILoginResponse | null) => void) | null = null;
let refreshInFlight: Promise<ILoginResponse | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setSessionListener = (listener: (session: ILoginResponse | null) => void) => {
  onSessionChange = listener;
};

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

const SKIP_REFRESH = /\/auth\/(login|refresh|logout)/;

const isSetupRequired = (error: unknown) =>
  axios.isAxiosError<IApiResponse>(error) &&
  error.response?.status === 403 &&
  error.response.data?.code === 'SETUP_REQUIRED';

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (isSetupRequired(error) && window.location.pathname !== '/setup') {
      window.location.assign('/setup');
    }
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
      // The session listener has already logged the user out; ProtectedRoute redirects.
      toast.error(SESSION_EXPIRED, { id: SESSION_EXPIRED });
      return Promise.reject(error);
    }

    if (shouldToast(error)) {
      const message = apiErrorMessage(error, 'Something went wrong. Try again.');
      // The message doubles as the id, so a burst of identical failures shows one toast.
      toast.error(message, { id: message });
    }
    return Promise.reject(error);
  },
);
