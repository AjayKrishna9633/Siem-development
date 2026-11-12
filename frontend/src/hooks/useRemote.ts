import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../lib/errors.ts';

interface IRequest<T> {
  fetcher: () => Promise<T>;
  reloadKey: number;
}

export const useRemote = <T>(fetcher: () => Promise<T>, errorMessage: string) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [settled, setSettled] = useState<IRequest<T> | null>(null);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(apiErrorMessage(err, errorMessage));
      })
      .finally(() => {
        if (active) setSettled({ fetcher, reloadKey });
      });
    return () => {
      active = false;
    };
  }, [fetcher, errorMessage, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const loading = settled?.fetcher !== fetcher || settled.reloadKey !== reloadKey;

  return { data, loading, error, reload };
};
