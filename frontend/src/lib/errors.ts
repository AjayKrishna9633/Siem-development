import axios from 'axios';

interface IApiErrorBody {
  message?: string;
  // On a 400 "Validation Error", the backend lists what was wrong with each field
  data?: { field?: string; message?: string }[] | null;
}

// Pulls the backend's message out of an axios error, with sensible fallbacks.
// Only a request that got no response at all means the server is unreachable;
// errors the app throws itself (like an invalid ID) show their own message.
export const apiErrorMessage = (
  err: unknown,
  fallback: string,
  offline = 'Cannot reach the SIEMple server.',
) => {
  if (axios.isAxiosError<IApiErrorBody>(err)) {
    if (!err.response) return offline;
    const body = err.response.data;
    // "Password must be at least 12 characters" beats a bare "Validation Error"
    const fieldMessages = Array.isArray(body?.data)
      ? [...new Set(body.data.map((d) => d.message).filter((m): m is string => !!m))]
      : [];
    if (fieldMessages.length > 0) return fieldMessages.join('. ');
    return body?.message || fallback;
  }
  return err instanceof Error && err.message ? err.message : fallback;
};
