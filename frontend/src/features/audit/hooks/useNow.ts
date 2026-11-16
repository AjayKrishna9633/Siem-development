import { useEffect, useState } from 'react';

// The current time, refreshed on an interval, so "5 minutes ago" keeps counting without a reload.
export const useNow = (intervalMs = 60_000): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
};
