import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Clock, Download, TriangleAlert, UserCheck, UserX } from 'lucide-react';
import { Page, PageHeader, ViewToggle } from '../../components/ui/PageHeader.tsx';
import { Panel, PanelHeader } from '../../components/ui/Panel.tsx';
import { KpiCard, Delta } from '../../components/ui/KpiCard.tsx';
import { FilterChip } from '../../components/ui/Misc.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Select } from '../../components/ui/Form.tsx';
import { Table, THead, Th, Tr, Td } from '../../components/ui/Table.tsx';
import { axisProps, chartColors, tooltipProps } from '../../components/charts/theme.ts';
import { cn } from '../../lib/cn.ts';

// Sample telemetry until the ingest API lands
const trend = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', 'Now'].map(
  (t, i) => ({
    t,
    low: [520, 470, 440, 400, 350, 300, 230, 210, 220][i],
    medium: [500, 280, 140, 120, 160, 230, 240, 190, 120][i],
    high: [160, 300, 270, 140, 90, 80, 90, 85, 80][i],
  }),
);

const techniques = [
  { id: 'T1059', name: 'Command and Scripting Interpreter', share: 42, color: chartColors.accent },
  { id: 'T1078', name: 'Valid Accounts', share: 28, color: '#cbd5e1' },
  { id: 'T1021', name: 'Remote Services', share: 18, color: '#64748b' },
  { id: 'Other', name: '', share: 12, color: '#334155' },
];

const sourceHosts = [
  { host: '192.168.1.105', count: 1204, flag: 'high' },
  { host: '10.0.4.52', count: 842 },
  { host: '172.16.0.12', count: 651 },
  { host: '192.168.2.201', count: 430 },
  { host: '10.0.1.19', count: 215 },
];

const targetedAssets = [
  { host: 'DB-Prod-01', count: 2150, flag: 'critical' },
  { host: 'DC-Primary', count: 1890, flag: 'high' },
  { host: 'Web-Front-04', count: 920 },
  { host: 'EXCH-Mail-01', count: 540 },
  { host: 'FS-Shared-02', count: 310 },
];

const HostTable: React.FC<{
  title: string;
  label: string;
  rows: { host: string; count: number; flag?: string }[];
}> = ({ title, label, rows }) => (
  <Panel>
    <header className="flex items-center justify-between border-b border-line px-4 py-3">
      <h3 className="font-semibold text-ink">{title}</h3>
      <Link to="/threat-hunting/events" className="text-xs text-accent hover:underline">
        View All
      </Link>
    </header>
    <Table>
      <THead>
        <tr>
          <Th>{label}</Th>
          <Th className="text-right">Event count</Th>
        </tr>
      </THead>
      <tbody>
        {rows.map((r) => (
          <Tr key={r.host}>
            <Td className="relative font-mono text-[13px]">
              {r.flag && (
                <span
                  className={cn(
                    'absolute inset-y-2 left-2 w-1 rounded-sm',
                    r.flag === 'critical' ? 'bg-critical' : 'bg-high',
                  )}
                />
              )}
              <span className="pl-2">{r.host}</span>
            </Td>
            <Td className="text-right font-mono text-[13px]">{r.count.toLocaleString()}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  </Panel>
);

export const ThreatHuntingDashboard: React.FC = () => {
  const [range, setRange] = useState('Last 24 Hours');
  const [filters, setFilters] = useState([
    { field: 'Severity', value: 'Critical, High', tone: 'high' as const },
    { field: 'Status', value: 'Open', tone: 'default' as const },
  ]);

  return (
    <div>
      <div className="border-b border-line">
        <Page className="pb-4">
          <PageHeader
            crumbs={[
              { label: 'Intelligence' },
              { label: 'Threat Hunting', to: '/threat-hunting' },
              { label: 'Dashboard' },
            ]}
            title="Threat Hunting Dashboard"
            actions={
              <ViewToggle
                tabs={[
                  { label: 'Dashboard', to: '/threat-hunting/dashboard' },
                  { label: 'Events', to: '/threat-hunting/events' },
                ]}
              />
            }
          />
        </Page>
      </div>

      <div className="border-b border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Clock className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted" />
              <Select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="w-44 [&_select]:pl-8"
              >
                {['Last 1 Hour', 'Last 24 Hours', 'Last 7 Days', 'Last 30 Days'].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[1px] text-muted">
              Active filters:
            </span>
            {filters.map((f) => (
              <FilterChip
                key={f.field}
                field={f.field}
                value={f.value}
                tone={f.tone}
                onRemove={() => setFilters((all) => all.filter((x) => x.field !== f.field))}
              />
            ))}
            {filters.length > 0 && (
              <button
                type="button"
                onClick={() => setFilters([])}
                className="text-xs text-accent hover:underline"
              >
                Clear All
              </button>
            )}
          </div>
          <Button variant="secondary" size="sm" icon={<Download className="size-3.5" />}>
            Generate Report
          </Button>
        </div>
      </div>

      <Page>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total events"
            value="48,291"
            icon={<Activity className="size-3.5" />}
            delta={<Delta value="12%" direction="up" upIsBad={false} />}
          />
          <KpiCard
            label="Critical alerts (12+)"
            value="24"
            tone="critical"
            highlight
            icon={<TriangleAlert className="size-3.5" />}
            delta={<Delta value="8%" direction="up" />}
          />
          <KpiCard
            label="Auth failures"
            value="1,402"
            icon={<UserX className="size-3.5" />}
            delta={<span className="font-mono text-[11px] text-medium">↑3%</span>}
          />
          <KpiCard
            label="Auth successes"
            value="12,844"
            icon={<UserCheck className="size-3.5" />}
            delta={<Delta value="1%" direction="down" upIsBad={false} />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              title={
                <span className="font-sans text-sm normal-case tracking-normal text-ink">
                  Alert Level Trend
                </span>
              }
            />
            <div className="h-64 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="t" {...axisProps} />
                  <YAxis {...axisProps} width={36} />
                  <Tooltip {...tooltipProps} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="low"
                    name="Low"
                    stroke={chartColors.low}
                    strokeWidth={3}
                    fill={chartColors.low}
                    fillOpacity={0.12}
                  />
                  <Area
                    type="monotone"
                    dataKey="medium"
                    name="Medium"
                    stroke={chartColors.medium}
                    strokeWidth={3}
                    fill="transparent"
                  />
                  <Area
                    type="monotone"
                    dataKey="high"
                    name="High"
                    stroke={chartColors.high}
                    strokeWidth={3}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title={
                <span className="font-sans text-sm normal-case tracking-normal text-ink">
                  Top MITRE ATT&CK Techniques
                </span>
              }
            />
            <div className="flex flex-wrap items-center justify-center gap-10 p-6">
              <div className="relative size-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={techniques}
                      dataKey="share"
                      innerRadius={52}
                      outerRadius={76}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {techniques.map((t) => (
                        <Cell key={t.id} fill={t.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl text-ink">14</span>
                  <span className="font-mono text-[9px] uppercase text-muted">Techniques</span>
                </div>
              </div>
              <ul className="space-y-2.5 text-sm">
                {techniques.map((t) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <span className="size-3 rounded-sm" style={{ background: t.color }} />
                    <Link to="/mitre/events" className="w-56 truncate text-muted hover:text-ink">
                      {t.id === 'Other' ? 'Other' : `${t.id} ${t.name}`}
                    </Link>
                    <span className="font-mono text-xs text-ink">{t.share}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <HostTable title="Top Source Hosts" label="Host" rows={sourceHosts} />
          <HostTable title="Top Targeted Assets" label="Asset" rows={targetedAssets} />
        </div>
      </Page>
    </div>
  );
};
