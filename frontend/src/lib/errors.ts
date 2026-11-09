import axios from 'axios';

interface IApiErrorBody {
  message?: string;
  code?: string;
  data?: { field?: string; message?: string }[] | null;
}

/**
 * Decides whether a failed request gets the global error toast. Only failures no form can
 * explain qualify: server unreachable, 5xx, rate limited, or missing permission.
 * 400/409/422 belong to the form that sent them; 401 is handled by the token refresh.
 */
export const shouldToast = (err: unknown): boolean => {
  if (axios.isCancel(err) || !axios.isAxiosError<IApiErrorBody>(err)) return false;
  if (err.config?.skipGlobalError) return false;
  if (!err.response) return true;
  const { status, data } = err.response;
  if (status === 403 && data?.code === 'SETUP_REQUIRED') return false;
  return status >= 500 || status === 429 || status === 403;
};

export const apiErrorMessage = (
  err: unknown,
  fallback: string,
  offline = 'Cannot reach the SIEMple server.',
) => {
  if (axios.isAxiosError<IApiErrorBody>(err)) {
    if (!err.response) return offline;
    const body = err.response.data;
    const fieldMessages = Array.isArray(body?.data)
      ? [...new Set(body.data.map((d) => d.message).filter((m): m is string => !!m))]
      : [];
    if (fieldMessages.length > 0) return fieldMessages.join('. ');
    return body?.message || fallback;
  }
  return err instanceof Error && err.message ? err.message : fallback;
};
