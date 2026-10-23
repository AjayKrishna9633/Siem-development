import React, { useMemo, useState } from 'react';
import {
  Ban,
  Calendar,
  ChevronRight,
  CircleAlert,
  Download,
  ExternalLink,
  Lock,
  X,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader.tsx';
import { MonoLabel, Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { SearchInput, Select } from '../../components/ui/Form.tsx';
import { StatusBadge } from '../../components/ui/Badge.tsx';
import { Avatar } from '../../components/ui/Misc.tsx';
import { Pagination } from '../../components/ui/Table.tsx';
import { cn } from '../../lib/cn.ts';

type Outcome = 'success' | 'denied' | 'failure';

interface IAuditRecord {
  id: string;
  time: string;
  actor: string;
  actorRole: string;
  actorEmail: string;
  actorIp: string;
  action: string;
  targetType: string;
  target: string;
  outcome: Outcome;
  change?: { field: string; from: string; to: string };
  reason?: string;
}

// Sample audit trail until the audit API lands
const records: IAuditRecord[] = [
  {
    id: 'a1',
    time: '2026-08-30 11:42:07',
    actor: 'Marcus Bell',
    actorRole: 'Administrator',
    actorEmail: 'marcus.bell@acme.example',
    actorIp: '203.0.113.24',
    action: 'sca.risk_accepted',
    targetType: 'SCA_RESULT',
    target: 'WEB-02 · 26002',
    outcome: 'success',
    reason: 'Compensating control in place until Q4 rollout.',
  },
  {
    id: 'a2',
    time: '2026-08-30 11:41:52',
    actor: 'Priya Raman',
    actorRole: 'Tier 2 Analyst',
    actorEmail: 'priya.raman@acme.example',
    actorIp: '203.0.113.51',
    action: 'sca.risk_accepted',
    targetType: 'SCA_RESULT',
    target: 'WEB-02 · 26003',
    outcome: 'denied',
  },
  {
    id: 'a3',
    time: '2026-08-30 09:18:33',
    actor: 'Marcus Bell',
    actorRole: 'Administrator',
    actorEmail: 'marcus.bell@acme.example',
    actorIp: '203.0.113.24',
    action: 'user.role_changed',
    targetType: 'USER',
    target: 'Sam Okafor',
    outcome: 'success',
    change: { field: 'role', from: 'tier_1_analyst', to: 'administrator' },
    reason: 'Taking over platform ownership while Marcus is on leave.',
  },
  {
    id: 'a4',
    time: '2026-08-30 08:52:10',
    actor: 'Sam Okafor',
    actorRole: 'Tier 1 Analyst',
    actorEmail: 'sam.okafor@acme.example',
    actorIp: '198.51.100.7',
    action: 'user.role_changed',
    targetType: 'USER',
    target: 'Sam Okafor',
    outcome: 'denied',
  },
  {
    id: 'a5',
    time: '2026-08-30 07:14:02',
    actor: 'system',
    actorRole: 'Service',
    actorEmail: 'system',
    actorIp: '127.0.0.1',
    action: 'auth.refresh_token',
    targetType: 'USER',
    target: 'priya.raman@acme.example',
    outcome: 'denied',
  },
  {
    id: 'a6',
    time: '2026-08-29 22:06:41',
    actor: 'Priya Raman',
    actorRole: 'Tier 2 Analyst',
    actorEmail: 'priya.raman@acme.example',
    actorIp: '203.0.113.51',
    action: 'malware.status_changed',
    targetType: 'DETECTION',
    target: 'FIN-DC-02',
    outcome: 'success',
  },
  {
    id: 'a7',
    time: '2026-08-29 18:30:55',
    actor: 'Marcus Bell',
    actorRole: 'Administrator',
    actorEmail: 'marcus.bell@acme.example',
    actorIp: '203.0.113.24',
    action: 'settings.retention_changed',
    targetType: 'SETTINGS',
    target: 'events retention',
    outcome: 'success',
    change: { field: 'retention_days', from: '90', to: '180' },
  },
  {
    id: 'a8',
    time: '2026-08-29 16:12:19',
    actor: 'Sam Okafor',
    actorRole: 'Tier 1 Analyst',
    actorEmail: 'sam.okafor@acme.example',
    actorIp: '198.51.100.7',
    action: 'finding.flagged',
    targetType: 'FINDING',
    target: 'SRV-PROD-DB-01',
    outcome: 'success',
  },
  {
    id: 'a9',
    time: '2026-08-29 14:47:08',
    actor: 'Priya Raman',
    actorRole: 'Tier 2 Analyst',
    actorEmail: 'priya.raman@acme.example',
    actorIp: '203.0.113.51',
    action: 'hunt.created',
    targetType: 'HUNT',
    target: 'Registry Run keys',
    outcome: 'success',
  },
  {
    id: 'a10',
    time: '2026-08-29 09:55:14',
    actor: 'unknown',
    actorRole: 'Unauthenticated',
    actorEmail: '—',
    actorIp: '45.83.64.1',
    action: 'auth.login_failed',
    targetType: 'USER',
    target: 'admin@acme.example',
    outcome: 'failure',
  },
  {
    id: 'a11',
    time: '2026-08-28 20:21:46',
    actor: 'Marcus Bell',
    actorRole: 'Administrator',
    actorEmail: 'marcus.bell@acme.example',
    actorIp: '203.0.113.24',
    action: 'user.disabled',
    targetType: 'USER',
    target: 'Elena Belova',
    outcome: 'success',
  },
];

const outcomeTone: Record<Outcome, 'success' | 'warning' | 'danger'> = {
  success: 'success',
  denied: 'warning',
  failure: 'danger',
};
const tabs: ('all' | Outcome)[] = ['all', 'success', 'denied', 'failure'];

const spark = (values: number[]) => values.map((v) => ({ v }));

export const AuditLog: React.FC = () => {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | Outcome>('all');
  const [range, setRange] = useState('Last 7 days');
  const [selectedId, setSelectedId] = useState<string | null>('a3');
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () =>
      records.filter(
        (r) =>
          (tab === 'all' || r.outcome === tab) &&
          `${r.actor} ${r.action} ${r.target}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, tab],
  );
  const selected = records.find((r) => r.id === selectedId) ?? null;

  const exportCsv = () => {
    const lines = [
      'time,actor,role,action,target_type,target,outcome',
      ...rows.map((r) =>
        [r.time, r.actor, r.actorRole, r.action, r.targetType, `"${r.target}"`, r.outcome].join(
          ',',
        ),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'siemple-audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <div className="min-w-0 flex-1 space-y-5 px-6 py-6">
        <PageHeader
          crumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Audit Log' }]}
          title={
            <span className="flex flex-wrap items-center gap-4">
              Audit Log
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong px-2 py-0.5 font-mono text-[10px] font-normal uppercase tracking-[0.5px] text-muted">
                <Lock className="size-3" /> Append-only · no retention limit
              </span>
            </span>
          }
          actions={
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv}>
              Export CSV
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Panel className="bg-raised/40 p-4">
            <div className="flex justify-between">
              <MonoLabel>Denied · 24h</MonoLabel>
              <Ban className="size-3.5 text-medium" />
            </div>
            <p className="mt-1 text-2xl font-semibold text-ink">7</p>
            <div className="flex items-end justify-between gap-2">
              <span className="text-xs text-muted">baseline 1–2/day</span>
              <div className="h-6 w-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spark([1, 1, 2, 1, 1, 2, 4, 7])}>
                    <Line dataKey="v" stroke="#eab308" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
          <Panel className="bg-raised/40 p-4">
            <div className="flex justify-between">
              <MonoLabel>Failed · 24h</MonoLabel>
              <CircleAlert className="size-3.5 text-muted" />
            </div>
            <p className="mt-1 text-2xl font-semibold text-ink">3</p>
            <span className="text-xs text-muted">validation, not refusal</span>
          </Panel>
          <Panel className="bg-raised/40 p-4">
            <MonoLabel>Privilege changes · 30d</MonoLabel>
            <p className="mt-1 text-2xl font-semibold text-ink">4</p>
            <span className="text-xs text-muted">2 promotions · 1 demotion</span>
          </Panel>
          <Panel className="bg-raised/40 p-4">
            <MonoLabel>Risk accepted · 30d</MonoLabel>
            <p className="mt-1 text-2xl font-semibold text-ink">11</p>
            <span className="text-xs text-muted">3 expire within 30 days</span>
          </Panel>
        </div>

        <Panel className="bg-raised/30">
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by actor, action or target..."
              className="w-72"
            />
            <div className="inline-flex rounded border border-line-strong p-0.5">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'rounded-sm px-3 py-1 text-xs capitalize',
                    tab === t ? 'bg-raised text-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  {t}{' '}
                  <span className="ml-1 text-subtle">
                    {t === 'all' ? records.length : records.filter((r) => r.outcome === t).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted" />
              <Select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="w-40 [&_select]:pl-8"
              >
                {['Last 24 hours', 'Last 7 days', 'Last 30 days'].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  {['Time (UTC)', 'Actor', 'Action', 'Target', 'Outcome', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.5px] text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      'cursor-pointer border-b border-line hover:bg-raised/50',
                      selectedId === r.id && 'bg-raised',
                    )}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-ink">
                      {r.time}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={r.actor === 'unknown' ? '??' : r.actor}
                          className={
                            r.actor === 'unknown' ? 'border-critical/50 text-critical' : undefined
                          }
                        />
                        <div>
                          <p className="text-[13px] font-medium text-ink">{r.actor}</p>
                          <p className="text-[10px] text-muted">{r.actorRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-2.5 font-mono text-xs text-ink">
                      {r.action}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="mr-2 font-mono text-[10px] text-subtle">{r.targetType}</span>
                      <span className="text-[13px] text-ink">{r.target}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge tone={outcomeTone[r.outcome]} dot>
                        {r.outcome}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      <ChevronRight className="size-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pages={1}
            onChange={setPage}
            summary={`Showing ${rows.length} of ${records.length} records`}
          />
        </Panel>
      </div>

      {selected && (
        <aside className="sticky top-16 h-[calc(100vh-4rem)] w-[320px] shrink-0 space-y-5 overflow-y-auto border-l border-line bg-surface p-5">
          <header className="flex items-start justify-between">
            <div>
              <h2 className="font-mono text-ink">{selected.action}</h2>
              <p className="mt-1 flex items-center gap-2 font-mono text-[11px] text-muted">
                <StatusBadge tone={outcomeTone[selected.outcome]} dot>
                  {selected.outcome}
                </StatusBadge>
                {selected.time} UTC
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-muted hover:text-ink"
              aria-label="Close record"
            >
              <X className="size-4" />
            </button>
          </header>

          <section className="space-y-2">
            <MonoLabel>Actor</MonoLabel>
            <div className="flex items-center gap-3 rounded border border-line-strong bg-canvas/50 p-3">
              <Avatar name={selected.actor} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{selected.actor}</p>
                <p className="truncate text-[11px] text-muted">{selected.actorEmail}</p>
              </div>
              <div className="text-right font-mono text-[10px] text-muted">
                <p className="uppercase">{selected.actorRole}</p>
                <p>{selected.actorIp}</p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <MonoLabel>Target</MonoLabel>
            <div className="flex items-center justify-between rounded border border-line-strong bg-canvas/50 p-3">
              <div>
                <MonoLabel className="text-[9px]">{selected.targetType}</MonoLabel>
                <p className="text-sm text-ink">{selected.target}</p>
              </div>
              <ExternalLink className="size-4 text-accent" />
            </div>
          </section>

          {selected.change && (
            <section className="space-y-2">
              <MonoLabel>Changes</MonoLabel>
              <div className="rounded border border-line-strong bg-canvas/50 font-mono text-xs">
                <p className="border-b border-line-strong px-3 py-2 text-ink">
                  {selected.change.field}
                </p>
                <div className="grid grid-cols-[48px_1fr] gap-y-1 px-3 py-2">
                  <span className="text-[10px] uppercase text-subtle">From</span>
                  <span className="text-muted">{selected.change.from}</span>
                  <span className="text-[10px] uppercase text-subtle">To</span>
                  <span className="font-semibold text-ink">{selected.change.to}</span>
                </div>
              </div>
            </section>
          )}

          {selected.reason && (
            <section className="space-y-2">
              <MonoLabel>Reason given</MonoLabel>
              <p className="rounded border border-line-strong bg-canvas/50 p-3 text-sm text-ink">
                {selected.reason}
              </p>
            </section>
          )}

          <p className="flex items-center gap-2 border-t border-line pt-4 text-[11px] text-subtle">
            <Lock className="size-3" /> This record cannot be edited or deleted by anyone, at any
            role.
          </p>
        </aside>
      )}
    </div>
  );
};
