import { useCallback, useState } from 'react';
import { useRemote } from '@/hooks/useRemote.ts';
import { auditService } from '../api/auditApi.ts';
import { filtersToParams, toQuery } from '../utils/filters.ts';
import type { IAuditFilters } from '../types/audit.types.ts';

export const PAGE_SIZE = 50;

export const useAuditLog = (filters: IAuditFilters, blockedReason: string | null) => {
  const filtersKey = filtersToParams(filters).toString();
  const [paging, setPaging] = useState<{ key: string; cursors: string[] }>({
    key: filtersKey,
    cursors: [],
  });
  const cursors = paging.key === filtersKey ? paging.cursors : [];
  const cursor = cursors.at(-1);

  const fetchPage = useCallback(() => {
    if (blockedReason) return Promise.reject(new Error(blockedReason));
    return auditService.list({ ...toQuery(filters, new Date()), limit: PAGE_SIZE, cursor });
  }, [filters, blockedReason, cursor]);

  const { data, loading, error, reload } = useRemote(fetchPage, 'Failed to load the audit log.');

  const older = () => {
    if (data?.nextCursor) setPaging({ key: filtersKey, cursors: [...cursors, data.nextCursor] });
  };
  const newer = () => setPaging({ key: filtersKey, cursors: cursors.slice(0, -1) });

  return {
    entries: data?.items ?? [],
    firstLoad: loading && !data,
    refreshing: loading && !!data,
    error,
    reload,
    pageNumber: cursors.length + 1,
    hasNewer: cursors.length > 0,
    hasOlder: !!data?.nextCursor,
    older,
    newer,
  };
};
