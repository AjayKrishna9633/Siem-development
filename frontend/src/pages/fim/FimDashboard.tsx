import React from 'react';
import { Link } from 'react-router';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  FolderOpen,
  Minus,
  MousePointerClick,
  Server,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  UserRound,
  ListChecks,
} from 'lucide-react';
import { ModuleTabs, Page } from '../../components/ui/PageHeader.tsx';
import { Panel, PanelHeader } from '../../components/ui/Panel.tsx';
import { KpiCard } from '../../components/ui/KpiCard.tsx';
import { Meter } from '../../components/ui/Misc.tsx';
import { Table, THead, Th, Tr, Td } from '../../components/ui/Table.tsx';
import { axisProps, chartColors, tooltipProps } from '../../components/charts/theme.ts';
import { cn } from '../../lib/cn.ts';

const fimTabs = [
  { label: 'Dashboard', to: '/fim/dashboard' },
  { label: 'Events', to: '/fim/events' },
];

// Sample telemetry until the ingest API lands
const trend = [
  280, 330, 220, 480, 420, 760, 650, 1060, 860, 1380, 1180, 1700, 1480, 1000, 1080, 780, 880, 600,
  720, 380, 420,
].map((v, i) => ({
  t: i % 3 === 0 ? `${String((i / 3) * 4).padStart(2, '0')}:00` : '',
  v,
}));

const paths = [
  { path: 'C:\\Windows\\System32\\drivers\\etc\\hosts', count: 412, flagged: true },
  { path: '/etc/passwd', count: 328 },
  { path: 'C:\\Program Files\\Common Files\\...msado15.dll', count: 245 },
  { path: '/var/log/auth.log', count: 164 },
  { path: 'HKLM\\Software\\Microsoft\\Windows\\...', count: 89 },
];

const hosts = [
  { host: 'SRV-DC-01.corp.local', events: 2451, trend: 'up' },
  { host: 'db-prod-cluster-a', events: 1892, trend: 'flat' },
  { host: 'web-fe-04.dmz', events: 1204, trend: 'down' },
  { host: 'jumpbox-adm-01', events: 845, trend: 'up' },
  { host: 'app-batch-node-2', events: 620, trend: 'flat' },
];

const users = [
  { user: 'system', events: 5210, pct: '36.4%' },
  { user: 'admin_svc', events: 3105, pct: '21.7%' },
  { user: 'j.doe', events: 1420, pct: '9.9%' },
  { user: 'backup_exec', events: 890, pct: '6.2%' },
  { user: 'unknown', events: 412, pct: '2.8%', anomaly: true },
];

const breakdowns = [
  {
    title: 'Action Type',
    icon: <MousePointerClick className="size-5" />,
    rows: [
      { label: 'Modified', value: '10.8k', color: 'bg-success' },
      { label: 'Created', value: '3.1k', color: 'bg-[#818cf8]' },
      { label: 'Deleted', value: '342', color: 'bg-[#a78bfa]' },
    ],
  },
  {
    title: 'Rule Type',
    icon: <ListChecks className="size-5" />,
    rows: [
      { label: 'Reg Key', value: '7.1k', color: 'bg-success' },
      { label: 'File Int.', value: '4.3k', color: 'bg-[#818cf8]' },
      { label: 'Reg Val', value: '2.8k', color: 'bg-[#a78bfa]' },
    ],
  },
];

const TrendIcon: React.FC<{ trend: string }> = ({ trend }) =>
  trend === 'up' ? (
    <ArrowUp className="ml-auto size-3.5 text-high" />
  ) : trend === 'down' ? (
    <ArrowDown className="ml-auto size-3.5 text-low" />
  ) : (
    <Minus className="ml-auto size-3.5 text-subtle" />
  );

export const FimDashboard: React.FC = () => (
  <div>
    <div className="border-b border-line px-6 pt-4">
      <ModuleTabs tabs={fimTabs} className="border-b-0" />
    </div>
    <Page>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total changes"
          value="14,291"
          footer={
            <span>
              <span className="text-high">
                <TrendingUp className="inline size-3.5" /> +12.4%
              </span>{' '}
              vs yesterday
            </span>
          }
        />
        <KpiCard
          label={
            <span className="flex items-center gap-1.5">
              <TriangleAlert className="size-3.5" /> Critical path violations
            </span>
          }
          value="8"
          tone="critical"
          outlined
          className="bg-critical/10"
          footer={
            <div className="space-y-2">
              <span className="text-critical">
                ↗ +2 <span className="text-critical/70">unacknowledged</span>
              </span>
              <Link
                to="/fim/events"
                className="flex items-center gap-1 border-t border-critical/30 pt-2 font-mono text-[10px] uppercase text-ink hover:text-accent"
              >
                View all violations <ArrowRight className="size-3" />
              </Link>
            </div>
          }
        />
        <KpiCard
          label="Files created"
          value="3,104"
          footer={
            <span className="text-low">
              <TrendingDown className="inline size-3.5" /> -4.1%
            </span>
          }
        />
        <KpiCard
          label="Files modified"
          value="10,845"
          footer={
            <span className="text-high">
              <TrendingUp className="inline size-3.5" /> +18.2%
            </span>
          }
        />
        <KpiCard label="Files deleted" value="342" footer="→ 0.0%" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Change volume (24h)"
            subtitle="Bars represent change intensity"
            actions={<FolderOpen className="size-4 text-muted" />}
          />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="fimFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.success} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={chartColors.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="t" {...axisProps} interval={0} />
                <YAxis {...axisProps} width={36} />
                <Tooltip {...tooltipProps} />
                <Area
                  type="linear"
                  dataKey="v"
                  name="Changes"
                  stroke={chartColors.success}
                  strokeWidth={4}
                  fill="url(#fimFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Event distribution" />
          <div className="divide-y divide-line">
            {breakdowns.map((b) => (
              <div key={b.title} className="flex items-center gap-5 p-4">
                <span className="flex size-20 shrink-0 items-center justify-center rounded-lg border-4 border-raised bg-canvas text-muted">
                  {b.icon}
                </span>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted">{b.title}</p>
                  {b.rows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-ink">
                        <span className={cn('size-2 rounded-full', r.color)} /> {r.label}
                      </span>
                      <span className="font-mono text-ink">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel>
          <PanelHeader
            title="Top modified paths"
            subtitle="Bars represent change intensity"
            actions={<FolderOpen className="size-4 text-muted" />}
          />
          <ul className="divide-y divide-line">
            {paths.map((p) => (
              <li key={p.path} className="relative flex items-center gap-3 px-4 py-3">
                {p.flagged && <span className="absolute inset-y-2 left-0 w-0.5 bg-critical" />}
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink" title={p.path}>
                  {p.path}
                </span>
                <Meter value={p.count} max={412} className="w-10" />
                <span className="w-8 text-right font-mono text-xs text-ink">{p.count}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="Top hosts" actions={<Server className="size-4 text-muted" />} />
          <Table>
            <THead>
              <tr>
                <Th>Hostname</Th>
                <Th className="text-right">Events</Th>
                <Th className="text-right">Trend</Th>
              </tr>
            </THead>
            <tbody>
              {hosts.map((h) => (
                <Tr key={h.host}>
                  <Td className="text-[13px]">{h.host}</Td>
                  <Td className="text-right font-mono text-xs">{h.events.toLocaleString()}</Td>
                  <Td>
                    <TrendIcon trend={h.trend} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>

        <Panel>
          <PanelHeader title="Top users" actions={<UserRound className="size-4 text-muted" />} />
          <Table>
            <THead>
              <tr>
                <Th>Username</Th>
                <Th className="text-right">Events</Th>
                <Th className="text-right">% of total</Th>
              </tr>
            </THead>
            <tbody>
              {users.map((u) => (
                <Tr key={u.user}>
                  <Td>
                    <span className="flex items-center gap-2 text-[13px]">
                      <span className="flex size-6 items-center justify-center rounded-sm bg-raised font-mono text-[10px] text-muted">
                        {u.user.slice(0, 2).toUpperCase()}
                      </span>
                      {u.user}
                      {u.anomaly && (
                        <span className="rounded-sm border border-critical/50 bg-critical/10 px-1 font-mono text-[9px] uppercase text-critical">
                          Anomaly
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td className="text-right font-mono text-xs">{u.events.toLocaleString()}</Td>
                  <Td className={cn('text-right font-mono text-xs', u.anomaly && 'text-medium')}>
                    {u.pct}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    </Page>
  </div>
);
