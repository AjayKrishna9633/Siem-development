import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../lib/errors.ts';

// Loads a list once and again on reload(); a stale response never overwrites a newer one.
// Pass a stable fetcher (a service method, not an inline arrow).
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
