// Pulls the backend's message out of an axios error, with sensible fallbacks
export const apiErrorMessage = (
  err: unknown,
  fallback: string,
  offline = 'Cannot reach the SIEMple server.',
) => {
  if (err && typeof err === 'object' && 'response' in err) {
    const axErr = err as { response?: { data?: { message?: string } } };
    return axErr.response?.data?.message || fallback;
  }
  return offline;
};
