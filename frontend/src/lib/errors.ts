import axios from 'axios';

interface IApiErrorBody {
  message?: string;
  data?: { field?: string; message?: string }[] | null;
}

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
