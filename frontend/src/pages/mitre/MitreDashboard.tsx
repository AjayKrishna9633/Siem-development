import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ListFilter } from 'lucide-react';
import { Page } from '../../components/ui/PageHeader.tsx';
import { Panel, PanelHeader } from '../../components/ui/Panel.tsx';
import { KpiCard } from '../../components/ui/KpiCard.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { SearchInput, Segmented } from '../../components/ui/Form.tsx';
import { Table, THead, Th, Tr, Td } from '../../components/ui/Table.tsx';
import { axisProps, chartColors, tooltipProps } from '../../components/charts/theme.ts';
import { MitreHeader } from './MitreHeader.tsx';

// Sample telemetry until the ingest API lands
const volume = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', 'Now'].map(
  (t, i) => ({
    t,
    impact: [120, 180, 260, 240, 200, 310, 380, 230, 330][i],
    evasion: [90, 130, 190, 200, 170, 230, 280, 190, 260][i],
    execution: [60, 90, 140, 150, 130, 170, 200, 150, 190][i],
    lateral: [25, 40, 60, 70, 60, 55, 70, 50, 80][i],
  }),
);

const series = [
  { key: 'impact', label: 'Impact', color: chartColors.high },
  { key: 'evasion', label: 'Defense Evasion', color: chartColors.medium },
  { key: 'execution', label: 'Execution', color: chartColors.accent },
  { key: 'lateral', label: 'Lateral Movement', color: chartColors.peach },
];

const tactics = [
  { name: 'Impact', events: 842, color: chartColors.high },
  { name: 'Defense Evasion', events: 615, color: chartColors.medium },
  { name: 'Execution', events: 320, color: chartColors.accent },
  { name: 'Lateral Movement', events: 198, color: chartColors.peach },
  { name: 'Privilege Escalation', events: 84 },
  { name: 'Credential Access', events: 61 },
];

const byHost = [
  { host: 'WIN-SVR-01', technique: 'T1565.001', count: 412 },
  { host: 'LNX-DB-PROD', technique: 'T1059.004', count: 287 },
  { host: 'WIN-SVR-02', technique: 'T1078.002', count: 156 },
  { host: 'WKSTN-7742', technique: 'T1059.001', count: 89 },
  { host: 'EXCH-SVR-01', technique: 'T1190', count: 45 },
  { host: 'WKSTN-8911', technique: 'T1110.001', count: 22 },
];

const stacked = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map((t, i) => ({
  t,
  'T1565.001': [60, 25, 70, 10, 30, 95][i],
  'T1059.004': [40, 35, 30, 30, 45, 30][i],
  'T1078.002': [35, 25, 40, 15, 30, 30][i],
}));

export const MitreDashboard: React.FC = () => {
  const [range, setRange] = useState<'1H' | '24H' | '7D'>('24H');
  const maxTactic = tactics[0].events;

  return (
    <div>
      <MitreHeader section="Dashboard" />
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-3">
        <SearchInput
          mono
          placeholder="Search techniques, hosts, tactics..."
          className="w-full max-w-xl"
        />
        <Button variant="secondary" icon={<ListFilter className="size-4" />}>
          Add filter
        </Button>
        <Segmented
          options={['1H', '24H', '7D'] as const}
          value={range}
          onChange={setRange}
          className="ml-auto"
        />
      </div>

      <Page>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tactics observed"
            value={
              <>
                6 <span className="text-sm text-muted">of 14</span>
              </>
            }
          >
            <div className="h-1 w-full bg-raised">
              <div className="h-full w-[43%] bg-medium" />
            </div>
          </KpiCard>
          <KpiCard
            label={
              <span className="flex w-full justify-between gap-6">
                Mapped events <span className="text-subtle">(24h)</span>
              </span>
            }
            value="2,120"
            delta={<span className="font-mono text-[11px] text-high">↗14%</span>}
          />
          <KpiCard
            label="Top technique"
            value={<span className="font-mono text-xl text-accent">T1565.001</span>}
            footer="Data Manipulation: Stored Data"
          />
          <KpiCard
            label="Unique techniques"
            value="12"
            footer="Detected actively across 4 endpoints"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <header className="flex flex-wrap items-start justify-between gap-4 px-4 pt-4">
              <h3 className="max-w-[220px] text-sm font-semibold text-ink">
                Mapped Event Volume Over Time (Top Tactics)
              </h3>
              <ul className="flex flex-wrap gap-4 font-mono text-[11px] text-muted">
                {series.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: s.color }} />{' '}
                    {s.label}
                  </li>
                ))}
              </ul>
            </header>
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volume}>
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="6 6" vertical={false} />
                  <XAxis dataKey="t" {...axisProps} />
                  <YAxis {...axisProps} width={36} />
                  <Tooltip {...tooltipProps} />
                  {series.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={4}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Top tactics" />
            <div className="flex justify-between px-4 py-2 font-mono text-[10px] uppercase text-muted">
              <span>Tactic</span>
              <span>Events</span>
            </div>
            <ul>
              {tactics.map((t) => (
                <li key={t.name} className="relative border-t border-line">
                  <span
                    className="absolute inset-y-0 left-0 bg-raised"
                    style={{ width: `${(t.events / maxTactic) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 text-ink">
                      {t.color && (
                        <span className="size-2 rounded-full" style={{ background: t.color }} />
                      )}
                      {t.name}
                    </span>
                    <span className="font-mono text-xs text-ink">{t.events}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel>
            <header className="px-4 py-3 text-sm font-semibold text-ink">
              Top Techniques by Host
            </header>
            <Table>
              <THead>
                <tr>
                  <Th>Host</Th>
                  <Th>Technique</Th>
                  <Th className="text-right">Count</Th>
                </tr>
              </THead>
              <tbody>
                {byHost.map((r) => (
                  <Tr key={r.host}>
                    <Td className="font-mono text-xs">{r.host}</Td>
                    <Td className="font-mono text-xs text-accent">{r.technique}</Td>
                    <Td className="text-right font-mono text-xs">{r.count}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Panel>

          <Panel className="xl:col-span-2">
            <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">Attacks by Technique Volume</h3>
              <ul className="flex gap-4 font-mono text-[11px] text-muted">
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 bg-[#fdba74]" /> T1565.001
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 bg-low" /> T1059.004
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 bg-line-strong" /> T1078.002
                </li>
              </ul>
            </header>
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stacked} barSize={28}>
                  <CartesianGrid stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="t" {...axisProps} />
                  <YAxis {...axisProps} width={32} />
                  <Tooltip {...tooltipProps} />
                  <Bar dataKey="T1078.002" stackId="a" fill={chartColors.muted} />
                  <Bar dataKey="T1059.004" stackId="a" fill={chartColors.low} />
                  <Bar dataKey="T1565.001" stackId="a" fill={chartColors.peach} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </Page>
    </div>
  );
};
