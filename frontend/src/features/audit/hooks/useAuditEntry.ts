import { useCallback } from 'react';
import { useRemote } from '@/hooks/useRemote.ts';
import { auditService } from '../api/auditApi.ts';
import type { IAuditLog } from '../types/audit.types.ts';

export const useAuditEntry = (id: string | null, loaded: IAuditLog[]) => {
  const found = id ? (loaded.find((entry) => entry.id === id) ?? null) : null;
  const needsFetch = !!id && !found;

  const fetchEntry = useCallback(
    () => (needsFetch && id ? auditService.get(id) : Promise.resolve(null)),
    [needsFetch, id],
  );
  const { data, loading, error } = useRemote(fetchEntry, 'Failed to load this entry.');

  return {
    entry: found ?? (needsFetch && data?.id === id ? data : null),
    loading: needsFetch && loading,
    error: needsFetch ? error : null,
  };
};
