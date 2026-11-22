import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Page, PageHeader } from '@/components/ui/PageHeader.tsx';
import { Panel } from '@/components/ui/Panel.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { useRemote } from '@/hooks/useRemote.ts';
import { usersService } from '@/services/users.service.ts';
import { apiErrorMessage } from '@/lib/errors.ts';
import { isUuid } from '@/utils/validation.ts';
import { auditService } from '../api/auditApi.ts';
import { AuditDetailDrawer } from '../components/AuditDetailDrawer.tsx';
import { AuditFilters, type IActorOption } from '../components/AuditFilters.tsx';
import { AuditTable } from '../components/AuditTable.tsx';
import { CursorPager } from '../components/CursorPager.tsx';
import { useAuditEntry } from '../hooks/useAuditEntry.ts';
import { useAuditLog } from '../hooks/useAuditLog.ts';
import {
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
  rangeError,
  toQuery,
} from '../utils/filters.ts';
import type { IAuditFilters, IAuditLog } from '../types/audit.types.ts';

const OPEN_ENTRY_PARAM = 'log';

const fetchUsers = () =>
  usersService.list({ page: 1, pageSize: 100, sortBy: 'name', sortDir: 'asc' });

export const AuditLogsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const rawLogId = searchParams.get(OPEN_ENTRY_PARAM);
  const logId = rawLogId && isUuid(rawLogId) ? rawLogId : null;

  const blockedReason = rangeError(filters, new Date());
  const log = useAuditLog(filters, blockedReason);
  const opened = useAuditEntry(logId, log.entries);
  const { data: users } = useRemote(fetchUsers, 'Failed to load users.');
  const [exporting, setExporting] = useState(false);

  const actors = useMemo<IActorOption[]>(() => {
    const byId = new Map<string, string>();
    users?.items.forEach((u) => byId.set(u.id, u.username ?? u.email));
    log.entries.forEach((e) => {
      if (e.actor.id && e.actor.username && !byId.has(e.actor.id)) {
        byId.set(e.actor.id, e.actor.username);
      }
    });
    if (filters.actorId && !byId.has(filters.actorId)) {
      byId.set(filters.actorId, `User ${filters.actorId.slice(0, 8)}`);
    }
    return [...byId]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users, log.entries, filters.actorId]);

  const setFilters = (next: IAuditFilters) =>
    setSearchParams(filtersToParams(next), { replace: true });

  const updateFilters = (patch: Partial<IAuditFilters>) => {
    const next = { ...filters, ...patch };
    if (patch.range === 'custom' && filters.range !== 'custom' && !patch.from && !patch.to) {
      const { from, to } = toQuery(filters, new Date());
      next.from = from;
      next.to = to;
    }
    setFilters(next);
  };

  const openEntry = (entry: IAuditLog) => {
    const params = filtersToParams(filters);
    params.set(OPEN_ENTRY_PARAM, entry.id);
    setSearchParams(params, { replace: true });
  };

  const closeEntry = () => setFilters(filters);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const filename = await auditService.exportCsv(toQuery(filters, new Date()));
      toast.success(`Exported ${filename}`);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'The export failed. Try again.'));
    } finally {
      setExporting(false);
    }
  };

  const active = hasActiveFilters(filters);
  const showError = !!log.error && !blockedReason;

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Audit Log' }]}
        title="Audit Log"
        description="Security-relevant actions on this SIEMple install. Entries can't be edited or deleted."
        actions={
          <Button
            variant="outline"
            icon={<Download className="size-4" />}
            disabled={exporting || !!blockedReason}
            onClick={exportCsv}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      <Panel className="bg-raised/30">
        <AuditFilters
          filters={filters}
          onChange={updateFilters}
          onClear={() => setSearchParams(new URLSearchParams(), { replace: true })}
          onRefresh={log.reload}
          actors={actors}
          loading={log.firstLoad || log.refreshing}
          hasActiveFilters={active}
          rangeError={blockedReason}
        />

        {showError ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <p className="text-sm text-high">{log.error}</p>
            <Button size="sm" variant="outline" onClick={log.reload}>
              Try again
            </Button>
          </div>
        ) : (
          <AuditTable
            entries={blockedReason ? [] : log.entries}
            loading={log.firstLoad && !blockedReason}
            refreshing={log.refreshing}
            selectedId={logId}
            emptyText={
              blockedReason
                ? 'Choose a valid date range to see entries.'
                : active
                  ? 'No audit entries match these filters.'
                  : 'No audit entries in this period.'
            }
            onSelect={openEntry}
            onFilterActor={(entry) => updateFilters({ actorId: entry.actor.id ?? undefined })}
          />
        )}

        <CursorPager
          pageNumber={log.pageNumber}
          count={blockedReason || showError ? 0 : log.entries.length}
          hasNewer={log.hasNewer}
          hasOlder={log.hasOlder && !showError}
          busy={log.firstLoad || log.refreshing}
          onNewer={log.newer}
          onOlder={log.older}
        />
      </Panel>

      {logId && (
        <AuditDetailDrawer
          entry={opened.entry}
          loading={opened.loading}
          error={opened.error}
          onClose={closeEntry}
        />
      )}
    </Page>
  );
};
