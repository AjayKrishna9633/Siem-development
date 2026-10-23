import React, { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import {
  BarChart3,
  Bug,
  Clock,
  Cpu,
  ExternalLink,
  FileText,
  Monitor,
  Radar,
  Settings,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { Page, PageHeader } from '../../components/ui/PageHeader.tsx';
import { MonoLabel, Panel, PanelHeader } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Select } from '../../components/ui/Form.tsx';
import { StatusBadge, Tag } from '../../components/ui/Badge.tsx';
import { EmptyState } from '../../components/ui/Misc.tsx';
import { Table, THead, Th, Tr, Td } from '../../components/ui/Table.tsx';
import { axisProps, chartColors, tooltipProps } from '../../components/charts/theme.ts';
import { cn } from '../../lib/cn.ts';
import { findAgent } from '../../data/agents.ts';

// Sample per-agent telemetry until the ingest API lands
const evolution = Array.from({ length: 25 }, (_, i) => ({
  t: i === 0 ? '-24h' : i === 12 ? '-12h' : i === 24 ? 'Now' : '',
  v: Math.round(380 + Math.sin(i / 3) * 140 + (i > 14 && i < 20 ? 220 : 0)),
}));

const tactics = [
  { name: 'Defense Evasion', count: 142, hot: true },
  { name: 'Impact', count: 89 },
  { name: 'Execution', count: 64 },
  { name: 'Privilege Escalation', count: 21 },
];

const compliance = [
  { req: '11.5', count: 280, color: chartColors.critical },
  { req: '10.2.2', count: 145, color: chartColors.medium },
  { req: '10.6.1', count: 92, color: chartColors.low },
  { req: 'Other', count: 507, color: '#334155' },
];

const vulnCounts = [
  { label: 'Critical', count: 4, cls: 'bg-critical text-white' },
  { label: 'High', count: 12, cls: 'bg-high text-canvas' },
  { label: 'Medium', count: 45, cls: 'bg-medium text-canvas' },
  { label: 'Low', count: 102, cls: 'bg-low text-white' },
];

const packages = [
  { name: 'openssl-1.1.1t-r0', count: 8, tone: 'text-critical' },
  { name: 'curl-7.88.1-r0', count: 5, tone: 'text-high' },
  { name: 'libxml2-2.10.3-r0', count: 4, tone: 'text-medium' },
  { name: 'sqlite-3.41.2-r0', count: 3, tone: 'text-medium' },
  { name: 'zlib-1.2.13-r0', count: 2, tone: 'text-low' },
];

const sca = [
  {
    policy: 'CIS Win 11 Enterprise',
    end: '2023-10-24 14:30',
    passed: 112,
    failed: 84,
    na: 15,
    score: 26,
  },
  {
    policy: 'Win Default Security',
    end: '2023-10-24 14:31',
    passed: 45,
    failed: 12,
    na: 2,
    score: 78,
  },
];

const fim = [
  {
    time: 'Oct 24, 15:42:11',
    action: 'modified',
    path: 'C:\\Windows\\System32\\drivers\\etc\\hosts',
    rule: 'Integrity checksum changed.',
    level: 7,
    id: 550,
  },
  {
    time: 'Oct 24, 14:10:05',
    action: 'deleted',
    path: 'C:\\Program Files\\CriticalApp\\config.json',
    rule: 'File deleted.',
    level: 10,
    id: 553,
  },
  {
    time: 'Oct 24, 11:05:22',
    action: 'added',
    path: 'C:\\Users\\admin\\Downloads\\installer_v2.exe',
    rule: 'File added to the system.',
    level: 3,
    id: 554,
  },
];

const moduleLinks = [
  { label: 'Threat hunting', to: '/threat-hunting/events', icon: <Radar className="size-3.5" /> },
  {
    label: 'File integrity monitoring',
    to: '/fim/events',
    icon: <FileText className="size-3.5" />,
  },
  {
    label: 'Configuration assessment',
    to: '/configuration/dashboard',
    icon: <ShieldCheck className="size-3.5" />,
  },
  { label: 'MITRE ATT&CK', to: '/mitre/events', icon: <Workflow className="size-3.5" /> },
];

const actionTone = { modified: 'warning', deleted: 'danger', added: 'info' } as const;

export const AgentDetail: React.FC = () => {
  const { agentId = '' } = useParams();
  const agent = findAgent(agentId);
  const [range, setRange] = useState('Last 24 hours');
  const [framework, setFramework] = useState('PCI DSS');

  if (!agent) {
    return (
      <Page>
        <EmptyState
          icon={<Monitor className="size-5" />}
          title="Agent not found"
          description={`No enrolled agent matches "${agentId}".`}
          action={
            <Link to="/agents">
              <Button variant="secondary">Back to agents</Button>
            </Link>
          }
        />
      </Page>
    );
  }

  const info = [
    { label: 'ID', value: `#${agent.id}` },
    {
      label: 'Status',
      value: (
        <span className={agent.status === 'active' ? 'text-low' : 'text-critical'}>
          {agent.status === 'active' ? 'Active' : 'Disconnected'}
        </span>
      ),
    },
    { label: 'IP address', value: agent.ip },
    { label: 'Version', value: agent.version },
    { label: 'Group', value: <Tag className="normal-case">{agent.groups[0]}</Tag> },
    { label: 'OS', value: agent.os },
    { label: 'Cluster node', value: agent.node },
    { label: 'Registration', value: agent.registered },
    { label: 'Last keep-alive', value: agent.lastKeepAlive },
  ];

  return (
    <Page>
      <PageHeader
        crumbs={[
          { label: 'Environment' },
          { label: 'Agents', to: '/agents' },
          { label: agent.name },
        ]}
        title={
          <span className="flex items-center gap-3">
            {agent.name}
            <span className="font-mono text-sm font-normal text-muted">#{agent.id}</span>
            <StatusBadge tone={agent.status === 'active' ? 'info' : 'danger'} dot>
              {agent.status === 'active' ? 'Active' : agent.status}
            </StatusBadge>
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" mono icon={<BarChart3 className="size-3.5" />}>
              Stats
            </Button>
            <Button variant="outline" size="sm" mono icon={<Settings className="size-3.5" />}>
              Configuration
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        {moduleLinks.map((m, i) => (
          <Link
            key={m.to}
            to={m.to}
            className={cn(
              'inline-flex items-center gap-2 rounded border px-3 py-1.5 font-mono text-[11px] uppercase transition-colors',
              i === 0
                ? 'border-accent/60 bg-accent/10 text-ink'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {m.icon} {m.label}
          </Link>
        ))}
      </div>

      <Panel className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-9">
        {info.map((i) => (
          <div key={i.label}>
            <MonoLabel>{i.label}</MonoLabel>
            <div className="mt-1 font-mono text-xs text-ink">{i.value}</div>
          </div>
        ))}
      </Panel>

      <Panel>
        <PanelHeader
          title="System inventory"
          icon={<Cpu className="size-3.5" />}
          actions={<ExternalLink className="size-3.5 text-muted" />}
        />
        <div className="grid grid-cols-2 divide-line p-4 sm:grid-cols-5 sm:divide-x">
          {[
            { label: 'Cores', value: agent.cores },
            { label: 'Memory', value: agent.memory },
            { label: 'CPU', value: agent.cpu },
            { label: 'Host name', value: agent.name },
            { label: 'Serial number', value: agent.serial },
          ].map((s) => (
            <div key={s.label} className="px-4 py-1">
              <MonoLabel>{s.label}</MonoLabel>
              <p className="mt-1 text-ink">{s.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex justify-end">
        <div className="relative">
          <Clock className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted" />
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="w-44 [&_select]:pl-8"
          >
            {['Last 1 hour', 'Last 24 hours', 'Last 7 days'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Events count evolution" />
          <div className="relative h-48 p-4">
            <p className="absolute right-5 top-4 text-right font-mono text-[11px] text-muted">
              Total: <span className="text-ink">12,402</span>
              <br />
              Peak: <span className="text-ink">842/30m</span>
            </p>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolution}>
                <XAxis dataKey="t" {...axisProps} interval={0} />
                <Tooltip {...tooltipProps} />
                <Area
                  type="monotone"
                  dataKey="v"
                  name="Events"
                  stroke="#475569"
                  fill="#334155"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="MITRE ATT&CK"
            icon={<Workflow className="size-3.5 text-high" />}
            actions={
              <Link to="/mitre/events" aria-label="Open MITRE events">
                <ExternalLink className="size-3.5 text-muted hover:text-ink" />
              </Link>
            }
          />
          <ul className="space-y-2 p-4">
            {tactics.map((t) => (
              <li
                key={t.name}
                className={cn(
                  'flex items-center justify-between rounded border px-3 py-2 font-mono text-xs',
                  t.hot ? 'border-line-strong bg-raised' : 'border-line-strong',
                )}
              >
                {t.name}
                <span
                  className={cn(
                    'rounded-sm border px-1.5 py-0.5',
                    t.hot
                      ? 'border-medium/50 bg-medium/10 text-medium'
                      : 'border-line-strong text-ink',
                  )}
                >
                  {t.count}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader
            title="Compliance"
            actions={
              <Select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="w-28 [&_select]:h-7 [&_select]:font-mono [&_select]:text-xs"
              >
                {['PCI DSS', 'HIPAA', 'GDPR', 'NIST 800-53'].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            }
          />
          <div className="flex items-center gap-6 p-4">
            <div className="relative size-28 shrink-0">
              <PieChart width={112} height={112}>
                <Pie
                  data={compliance}
                  dataKey="count"
                  innerRadius={40}
                  outerRadius={54}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {compliance.map((c) => (
                    <Cell key={c.req} fill={c.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-ink">1,024</span>
                <span className="font-mono text-[9px] uppercase text-muted">Reqs</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2 font-mono text-xs">
              {compliance.map((c) => (
                <li key={c.req} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: c.color }} /> {c.req}
                  </span>
                  <span className="text-muted">({c.count})</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Vulnerability detection"
            icon={<Bug className="size-3.5 text-critical" />}
            actions={
              <Link to="/vulnerabilities/inventory" aria-label="Open vulnerability inventory">
                <ExternalLink className="size-3.5 text-muted hover:text-ink" />
              </Link>
            }
          />
          <div className="grid grid-cols-[180px_1fr]">
            <div className="space-y-3 border-r border-line p-4">
              {vulnCounts.map((v) => (
                <div
                  key={v.label}
                  className="flex items-center justify-between rounded border border-line-strong px-3 py-2 font-mono text-xs uppercase"
                >
                  {v.label}
                  <span className={cn('rounded-sm px-1.5 py-0.5', v.cls)}>{v.count}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="border-b border-line px-4 py-2 font-mono text-[10px] uppercase text-muted">
                Top 5 vulnerable packages
              </p>
              <ul className="divide-y divide-line">
                {packages.map((p) => (
                  <li key={p.name} className="flex justify-between px-4 py-2.5 font-mono text-xs">
                    {p.name}
                    <span className={p.tone}>{p.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Security configuration assessment"
            icon={<ShieldCheck className="size-3.5 text-accent" />}
          />
          <Table>
            <THead>
              <tr>
                <Th>Policy</Th>
                <Th>End scan</Th>
                <Th className="text-right">Passed</Th>
                <Th className="text-right">Failed</Th>
                <Th className="text-right">N/A</Th>
                <Th className="text-right">Score</Th>
              </tr>
            </THead>
            <tbody>
              {sca.map((s) => (
                <Tr key={s.policy}>
                  <Td className="text-xs">
                    <Link to="/configuration/dashboard" className="hover:text-accent">
                      {s.policy}
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs text-muted">{s.end}</Td>
                  <Td className="text-right font-mono text-xs text-low">{s.passed}</Td>
                  <Td className="text-right font-mono text-xs text-critical">{s.failed}</Td>
                  <Td className="text-right font-mono text-xs">{s.na}</Td>
                  <Td
                    className={cn(
                      'text-right font-mono text-xs font-semibold',
                      s.score < 50 ? 'text-critical' : 'text-high',
                    )}
                  >
                    {s.score}%
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="File integrity monitoring: recent events"
          icon={<FileText className="size-3.5" />}
          actions={
            <Link to="/fim/events">
              <Button variant="outline" size="sm" mono>
                View all
              </Button>
            </Link>
          }
        />
        <Table>
          <THead>
            <tr>
              <Th>Time</Th>
              <Th>Action</Th>
              <Th>Path</Th>
              <Th>Rule description</Th>
              <Th className="text-right">Level</Th>
              <Th className="text-right">Rule ID</Th>
            </tr>
          </THead>
          <tbody>
            {fim.map((f) => (
              <Tr key={f.id}>
                <Td className="whitespace-nowrap font-mono text-xs text-muted">{f.time}</Td>
                <Td>
                  <StatusBadge tone={actionTone[f.action as keyof typeof actionTone]}>
                    {f.action}
                  </StatusBadge>
                </Td>
                <Td className="font-mono text-xs">{f.path}</Td>
                <Td className="text-xs">{f.rule}</Td>
                <Td
                  className={cn(
                    'text-right font-mono text-xs',
                    f.level >= 10 ? 'text-critical' : f.level >= 7 ? 'text-high' : 'text-low',
                  )}
                >
                  {f.level}
                </Td>
                <Td className="text-right font-mono text-xs text-muted">{f.id}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </Page>
  );
};
