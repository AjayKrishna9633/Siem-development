import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../lib/errors.ts';

export const useRemoteList = <T>(fetcher: () => Promise<T[]>, errorMessage: string) => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => {
        if (!active) return;
        setItems(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(apiErrorMessage(err, errorMessage));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetcher, errorMessage, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  return { items, setItems, loading, error, reload };
};
