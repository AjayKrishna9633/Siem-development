import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Download,
  FileText,
  FlaskConical,
  Lightbulb,
  ListFilter,
  Rows3,
  Server,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { Panel, PanelHeader, MonoLabel } from '../components/ui/Panel.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Select } from '../components/ui/Form.tsx';
import { SeverityBadge } from '../components/ui/Badge.tsx';
import { axisProps, chartColors, tooltipProps } from '../components/charts/theme.ts';
import { cn } from '../lib/cn.ts';
import type { Severity } from '../lib/severity.ts';

// Sample compliance data — the page shows the SAMPLE DATA flag from the Figma design
const failing = [
  { req: '11.5 FIM', events: 423, color: chartColors.critical },
  { req: '6.2 Patching', events: 312, color: '#ea580c' },
  { req: '8.2 MFA', events: 215, color: '#ca8a04' },
  { req: '10.2 Auditing', events: 145, color: chartColors.low },
  { req: '2.2 Config', events: 89, color: chartColors.accent },
];

const trend = Array.from({ length: 11 }, (_, i) => ({
  d: i === 0 ? 'Oct 1' : i === 5 ? 'Oct 15' : i === 10 ? 'Oct 31' : `Oct ${1 + i * 3}`,
  pass: [61, 62, 57, 66, 65, 75, 74, 79, 77, 72, 68][i],
  violations: [10, 18, 13, 8, 30, 20, 16, 10, 5, 12, 18][i],
  tone: [0, 1, 2, 0, 3, 2, 1, 0, 0, 1, 2][i],
}));
const violationColors = ['#1e3a8a', '#713f12', '#7c2d12', '#7f1d1d'];

interface IControl {
  id: string;
  title: string;
  severity: Severity;
  label?: string;
  agents: number;
  events: number;
  lastSeen: string;
  hosts?: { host: string; events: number }[];
  logs?: string[];
}

const controls: IControl[] = [
  {
    id: 'PCI-11.5',
    title: 'Deploy file integrity monitoring tools',
    severity: 'high',
    agents: 42,
    events: 423,
    lastSeen: '2m ago',
    hosts: [
      { host: 'db-prod-01.aws.internal', events: 145 },
      { host: 'db-prod-02.aws.internal', events: 132 },
      { host: 'web-auth-04.aws.internal', events: 89 },
    ],
    logs: [
      "ERR: FIM service 'siemple-syscheckd' not running on host...",
      'ERR: Auditd ruleset missing specific watch on /etc/passwd...',
      'ERR: FIM service disconnected from master for 24h+...',
    ],
  },
  {
    id: 'PCI-6.2',
    title:
      'Ensure that all system components and software are protected from known vulnerabilities',
    severity: 'high',
    agents: 14,
    events: 312,
    lastSeen: '1h ago',
  },
  {
    id: 'PCI-8.2',
    title: 'Employ multi-factor authentication for all non-console administrative access',
    severity: 'medium',
    label: 'Med',
    agents: 5,
    events: 215,
    lastSeen: '4h ago',
  },
  {
    id: 'PCI-10.2',
    title: 'Implement automated audit trails for all system components',
    severity: 'low',
    agents: 2,
    events: 145,
    lastSeen: '1d ago',
  },
];

const insights = [
  {
    n: 1,
    title: 'FIM Coverage Gap Detected',
    body: "PCI Req 11.5 shows widespread failure across 'pci-cde' tag group since last deployment window.",
    tone: 'border-critical/40 text-critical',
  },
  {
    n: 2,
    title: 'Patching SLA Breach',
    body: '14 hosts exceeded 30-day critical patch window (Req 6.2).',
    tone: 'border-medium/40 text-medium',
  },
];

export const Compliance: React.FC = () => {
  const [framework, setFramework] = useState('PCI DSS 4.0');
  const [scope, setScope] = useState('All Agents');
  const [range, setRange] = useState('Last 30 Days');
  const [open, setOpen] = useState<string | null>('PCI-11.5');

  const exportCsv = () => {
    const header = 'req_id,title,severity,affected_agents,event_count,last_seen';
    const body = controls.map((c) =>
      [c.id, `"${c.title}"`, c.severity, c.agents, c.events, c.lastSeen].join(','),
    );
    const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siemple-compliance-${framework.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-6 py-6">
      {/* Scope bar */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded border border-line-strong bg-surface pl-3">
          <BookOpen className="size-4 text-muted" />
          <MonoLabel>Framework</MonoLabel>
          <Select
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="w-36 [&_select]:border-0 [&_select]:bg-transparent"
          >
            {['PCI DSS 4.0', 'HIPAA', 'GDPR', 'NIST 800-53', 'TSC'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 rounded border border-line-strong bg-surface pl-3">
          <Crosshair className="size-4 text-muted" />
          <MonoLabel>Scope</MonoLabel>
          <Select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="w-36 [&_select]:border-0 [&_select]:bg-transparent"
          >
            {['All Agents', 'pci-cde', 'production', 'dmz'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 rounded border border-line-strong bg-surface pl-3">
          <CalendarDays className="size-4 text-muted" />
          <MonoLabel>Range</MonoLabel>
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="w-36 [&_select]:border-0 [&_select]:bg-transparent"
          >
            {['Last 7 Days', 'Last 30 Days', 'Last 90 Days'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </label>
        <span className="inline-flex items-center gap-1.5 rounded border border-high/50 bg-high/10 px-2 py-1 font-mono text-[10px] uppercase text-high">
          <FlaskConical className="size-3.5" /> Sample data
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto"
          icon={<ListFilter className="size-3.5" />}
        >
          Filters <span className="rounded-full bg-line-strong px-1.5 text-[10px]">2</span>
        </Button>
      </div>

      {/* Posture */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Panel className="grid gap-6 p-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <MonoLabel className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-accent" /> Compliance posture
            </MonoLabel>
            <p className="flex items-baseline gap-4">
              <span className="text-5xl font-bold text-ink">68%</span>
              <span className="text-muted">41 of 60 requirements</span>
            </p>
            <div className="flex flex-wrap items-center gap-6 border-t border-line pt-4 text-xs text-muted">
              <span className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-sm bg-success/15 px-1.5 py-0.5 text-success">
                  <TrendingUp className="size-3.5" /> +2.4%
                </span>
                vs last month
              </span>
              <span className="flex items-center gap-2">
                <Server className="size-4" /> <span className="text-ink">498</span> / 500 agents
                reporting
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:border-l lg:border-line lg:pl-6">
            {[
              { label: 'Passing', value: 41, cls: 'text-success', bar: 'bg-success', w: '70%' },
              { label: 'Failing', value: 12, cls: 'text-critical', bar: 'bg-critical', w: '20%' },
              { label: 'Not applicable', value: 4, cls: 'text-muted' },
              { label: 'No data', value: 3, cls: 'text-medium', warn: true },
            ].map((s) => (
              <div
                key={s.label}
                className={cn(
                  'rounded border p-3',
                  s.warn ? 'border-medium/50' : 'border-line-strong',
                )}
              >
                <MonoLabel className={cn('flex items-center gap-1', s.warn && 'text-medium')}>
                  {s.warn && <TriangleAlert className="size-3" />}
                  {s.label}
                </MonoLabel>
                <div className="mt-1 flex items-center justify-between">
                  <span className={cn('text-2xl', s.cls)}>{s.value}</span>
                  {s.bar && (
                    <span className="h-1 w-6 rounded bg-raised">
                      <span className={cn('block h-full rounded', s.bar)} style={{ width: s.w }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <MonoLabel>Key insights</MonoLabel>
            <Lightbulb className="size-4 text-muted" />
          </div>
          <ul className="mt-4 space-y-4">
            {insights.map((i) => (
              <li key={i.n} className="flex gap-3">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-sm border font-mono text-xs',
                    i.tone,
                  )}
                >
                  {i.n}
                </span>
                <div>
                  <p className="text-sm text-ink">{i.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{i.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Top failing requirements"
            icon={<ChartColumn className="size-3.5" />}
          />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={failing} layout="vertical" barSize={16} margin={{ left: 20 }}>
                <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="req" {...axisProps} width={84} />
                <Tooltip {...tooltipProps} />
                <Bar
                  dataKey="events"
                  name="Events"
                  radius={[0, 2, 2, 0]}
                  label={{
                    position: 'insideLeft',
                    fill: '#f8fafc',
                    fontSize: 10,
                    formatter: (v: unknown) => `${v} events`,
                  }}
                >
                  {failing.map((f) => (
                    <Cell key={f.req} fill={f.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Compliance trend (30D)"
            icon={<TrendingUp className="size-3.5" />}
            actions={
              <span className="flex gap-3 font-mono text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-success" /> Pass rate
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 bg-critical/60" /> Violations
                </span>
              </span>
            }
          />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="d" {...axisProps} interval={4} />
                <YAxis
                  {...axisProps}
                  width={36}
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="violations" name="Violations" barSize={22}>
                  {trend.map((t, i) => (
                    <Cell key={i} fill={violationColors[t.tone]} fillOpacity={0.8} />
                  ))}
                </Bar>
                <ReferenceLine
                  x="Oct 25"
                  stroke={chartColors.medium}
                  strokeDasharray="3 3"
                  label={{ value: 'Audit: Nov 15', fill: '#eab308', fontSize: 10, position: 'top' }}
                />
                <Line
                  type="monotone"
                  dataKey="pass"
                  name="Pass rate"
                  stroke={chartColors.success}
                  strokeWidth={4}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Failing controls detail"
          icon={<Rows3 className="size-3.5" />}
          actions={
            <Button variant="secondary" size="sm" mono>
              Filter
            </Button>
          }
        />
        <div className="grid grid-cols-[40px_110px_1fr_90px_90px_90px_80px] px-4 py-2 font-mono text-[10px] uppercase text-muted">
          <span />
          <span>Req ID</span>
          <span>Title</span>
          <span>Severity</span>
          <span className="text-right">Affected agents</span>
          <span className="text-right">Event count</span>
          <span className="text-right">Last seen</span>
        </div>
        {controls.map((c) => {
          const isOpen = open === c.id;
          return (
            <div
              key={c.id}
              className={cn(
                'border-t border-line',
                isOpen && 'border-l-2 border-l-accent/60 bg-raised/30',
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : c.id)}
                className="grid w-full grid-cols-[40px_110px_1fr_90px_90px_90px_80px] items-center px-4 py-3 text-left"
              >
                {isOpen ? (
                  <ChevronDown className="size-4 text-muted" />
                ) : (
                  <ChevronRight className="size-4 text-muted" />
                )}
                <span className="font-mono text-xs text-muted">{c.id}</span>
                <span className="pr-4 text-sm text-ink">{c.title}</span>
                <span>
                  <SeverityBadge severity={c.severity} label={c.label} />
                </span>
                <span className="text-right font-mono text-sm text-ink">{c.agents}</span>
                <span className="text-right font-mono text-sm text-ink">{c.events}</span>
                <span className="text-right text-xs text-muted">{c.lastSeen}</span>
              </button>
              {isOpen && c.hosts && (
                <div className="grid gap-4 px-14 pb-4 lg:grid-cols-2">
                  <div className="rounded border border-line-strong bg-canvas p-3">
                    <MonoLabel>Top affected hosts</MonoLabel>
                    <ul className="mt-2 space-y-1.5 font-mono text-xs">
                      {c.hosts.map((h) => (
                        <li key={h.host} className="flex justify-between">
                          <span className="text-ink">{h.host}</span>
                          <span className="text-high">{h.events} events</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded border border-line-strong bg-canvas p-3">
                    <MonoLabel>Recent failure logs</MonoLabel>
                    <ul className="mt-2 space-y-1.5 font-mono text-xs text-critical">
                      {c.logs?.map((l) => (
                        <li key={l} className="truncate">
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="rounded border border-line-strong px-3 py-1.5 font-mono text-[10px] text-muted">
          Applied filter scope: <span className="text-ink">Scope: {scope}</span> | Framework:{' '}
          <span className="text-ink">{framework}</span> | Range:{' '}
          <span className="text-ink">{range}</span>
        </p>
        <div className="flex gap-3">
          <Button variant="outline" mono icon={<Download className="size-4" />} onClick={exportCsv}>
            Export CSV
          </Button>
          <Button variant="primary" mono icon={<FileText className="size-4" />}>
            Generate report
          </Button>
        </div>
      </div>
    </div>
  );
};
