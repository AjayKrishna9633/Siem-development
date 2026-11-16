import { useCallback } from 'react';
import { useRemote } from '@/hooks/useRemote.ts';
import { auditService } from '../api/auditApi.ts';
import type { IAuditLog } from '../types/audit.types.ts';

// The entry shown in the detail drawer. Normally it is already on the page, so no request is made.
// When the drawer is opened from a link (`?log=<id>`) the entry may be on another page, or older
// than the current filters, so it is fetched by id.
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
