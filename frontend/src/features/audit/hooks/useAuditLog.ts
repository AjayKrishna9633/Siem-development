import { useCallback, useState } from 'react';
import { useRemote } from '@/hooks/useRemote.ts';
import { auditService } from '../api/auditApi.ts';
import { filtersToParams, toQuery } from '../utils/filters.ts';
import type { IAuditFilters } from '../types/audit.types.ts';

export const PAGE_SIZE = 50;

// One page of the log at a time, newest first, walked with the server's cursors.
//
// `cursors` is the trail of cursors taken to get here: [] is the newest page, [c1] the page after
// it, and so on. "Older" pushes the cursor the server just handed back; "Newer" pops one. Changing
// any filter starts a new trail, so you never carry page 3's cursor into a different search.
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
    // `now` is read here, per request, so a relative range ("last 24 hours") moves forward on
    // Refresh instead of being frozen at the moment the page opened.
    return auditService.list({ ...toQuery(filters, new Date()), limit: PAGE_SIZE, cursor });
  }, [filters, blockedReason, cursor]);

  const { data, loading, error, reload } = useRemote(fetchPage, 'Failed to load the audit log.');

  const older = () => {
    if (data?.nextCursor) setPaging({ key: filtersKey, cursors: [...cursors, data.nextCursor] });
  };
  const newer = () => setPaging({ key: filtersKey, cursors: cursors.slice(0, -1) });

  return {
    entries: data?.items ?? [],
    // True only until the first response; after that old rows stay visible while the next load runs.
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
