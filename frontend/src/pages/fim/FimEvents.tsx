import React, { useMemo, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { ModuleTabs } from '../../components/ui/PageHeader.tsx';
import { SeverityBadge, StatusBadge } from '../../components/ui/Badge.tsx';
import { Checkbox, Select, Toggle } from '../../components/ui/Form.tsx';
import { FilterChip } from '../../components/ui/Misc.tsx';
import { QuerySection, QuerySidebar } from '../../components/events/QuerySidebar.tsx';
import { Table, THead, Th, Tr, Td } from '../../components/ui/Table.tsx';
import { cn } from '../../lib/cn.ts';
import { severityBg, type Severity } from '../../lib/severity.ts';

type ChangeType = 'modified' | 'added' | 'deleted';

interface IFimEvent {
  id: string;
  time: string;
  host: string;
  path: string;
  type: ChangeType;
  user: string;
  severity: Severity;
  critical: boolean;
}

const fimTabs = [
  { label: 'Dashboard', to: '/fim/dashboard' },
  { label: 'Events', to: '/fim/events' },
];

// Sample telemetry until the ingest API lands
const events: IFimEvent[] = [
  {
    id: 'f1',
    time: '2023-10-27 10:45:00',
    host: 'srv-web-01',
    path: '/etc/shadow',
    type: 'modified',
    user: 'root',
    severity: 'critical',
    critical: true,
  },
  {
    id: 'f2',
    time: '2023-10-27 10:42:15',
    host: 'srv-db-04',
    path: '/var/lib/pgsql/data/pg_hba.conf',
    type: 'modified',
    user: 'postgres',
    severity: 'high',
    critical: true,
  },
  {
    id: 'f3',
    time: '2023-10-27 10:31:52',
    host: 'SRV-DC-01',
    path: 'C:\\Windows\\System32\\drivers\\etc\\hosts',
    type: 'modified',
    user: 'SYSTEM',
    severity: 'high',
    critical: true,
  },
  {
    id: 'f4',
    time: '2023-10-27 10:12:08',
    host: 'web-fe-04',
    path: '/var/www/html/upload/shell.php',
    type: 'added',
    user: 'www-data',
    severity: 'critical',
    critical: false,
  },
  {
    id: 'f5',
    time: '2023-10-27 09:58:40',
    host: 'jumpbox-adm-01',
    path: '/home/admin/.ssh/authorized_keys',
    type: 'modified',
    user: 'admin',
    severity: 'medium',
    critical: false,
  },
  {
    id: 'f6',
    time: '2023-10-27 09:44:11',
    host: 'app-batch-node-2',
    path: '/opt/app/logs/batch-2023-10-26.log',
    type: 'deleted',
    user: 'backup_exec',
    severity: 'low',
    critical: false,
  },
];

const typeTone: Record<ChangeType, 'warning' | 'info' | 'danger'> = {
  modified: 'warning',
  added: 'info',
  deleted: 'danger',
};
const ALL_SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];

export const FimEvents: React.FC = () => {
  const [host, setHost] = useState('');
  const [changeType, setChangeType] = useState('All Types');
  const [severities, setSeverities] = useState<Set<Severity>>(new Set(['critical', 'high']));
  const [range, setRange] = useState('Last 24 Hours');
  const [criticalOnly, setCriticalOnly] = useState(true);

  const reset = () => {
    setHost('');
    setChangeType('All Types');
    setSeverities(new Set(ALL_SEVERITIES));
    setCriticalOnly(false);
  };

  const toggleSeverity = (s: Severity) =>
    setSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const rows = useMemo(
    () =>
      events.filter(
        (e) =>
          e.host.toLowerCase().includes(host.toLowerCase()) &&
          (changeType === 'All Types' || e.type === changeType.toLowerCase()) &&
          severities.has(e.severity) &&
          (!criticalOnly || e.critical),
      ),
    [host, changeType, severities, criticalOnly],
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-line px-6 pt-4">
        <ModuleTabs tabs={fimTabs} className="border-b-0" />
      </div>
      <div className="flex flex-1">
        <QuerySidebar onReset={reset}>
          <QuerySection title="Target host">
            <div className="relative">
              <HardDrive className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g. srv-web-01"
                className="h-9 w-full rounded border border-line-strong bg-canvas pl-8 pr-3 text-sm text-ink placeholder:text-subtle focus:border-accent/60 focus:outline-none"
              />
            </div>
          </QuerySection>
          <QuerySection title="Change type">
            <Select value={changeType} onChange={(e) => setChangeType(e.target.value)}>
              {['All Types', 'Modified', 'Added', 'Deleted'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </QuerySection>
          <QuerySection title="Severity">
            {ALL_SEVERITIES.map((s) => (
              <Checkbox
                key={s}
                checked={severities.has(s)}
                onChange={() => toggleSeverity(s)}
                label={
                  <span className="flex items-center gap-2 capitalize">
                    <span className={cn('size-1.5 rounded-full', severityBg[s])} /> {s}
                  </span>
                }
              />
            ))}
          </QuerySection>
          <QuerySection title="Time range">
            <Select value={range} onChange={(e) => setRange(e.target.value)}>
              {['Last 1 Hour', 'Last 24 Hours', 'Last 7 Days'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </QuerySection>
          <div className="border-t border-line pt-4">
            <Toggle
              checked={criticalOnly}
              onChange={setCriticalOnly}
              label={
                <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-muted">
                  Critical paths only
                </span>
              }
            />
          </div>
        </QuerySidebar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase text-muted">Active filters:</span>
              {[...severities].map((s) => (
                <FilterChip
                  key={s}
                  value={<span className="capitalize">{s}</span>}
                  tone={s === 'critical' ? 'critical' : s === 'high' ? 'high' : 'default'}
                  onRemove={() => toggleSeverity(s)}
                />
              ))}
              <FilterChip value={range} tone="accent" />
            </div>
            <span className="font-mono text-[10px] uppercase text-muted">
              Showing 1-{rows.length} of 14,291 events
            </span>
          </div>
          <Table>
            <THead>
              <tr>
                <Th>Timestamp (UTC)</Th>
                <Th>Host</Th>
                <Th>File path</Th>
                <Th>Type</Th>
                <Th>User</Th>
                <Th>Severity</Th>
              </tr>
            </THead>
            <tbody>
              {rows.map((e) => (
                <Tr key={e.id}>
                  <Td className="whitespace-nowrap font-mono text-xs">{e.time}</Td>
                  <Td className="text-[13px]">{e.host}</Td>
                  <Td className="font-mono text-xs text-muted">{e.path}</Td>
                  <Td>
                    <StatusBadge tone={typeTone[e.type]}>{e.type}</StatusBadge>
                  </Td>
                  <Td className="font-mono text-xs">{e.user}</Td>
                  <Td>
                    <SeverityBadge severity={e.severity} />
                  </Td>
                </Tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                    No file changes match the current query parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
};
