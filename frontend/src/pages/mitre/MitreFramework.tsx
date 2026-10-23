import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ListFilter } from 'lucide-react';
import { Select, Toggle } from '../../components/ui/Form.tsx';
import { MonoLabel, Panel } from '../../components/ui/Panel.tsx';
import { cn } from '../../lib/cn.ts';
import type { Severity } from '../../lib/severity.ts';
import { MitreHeader } from './MitreHeader.tsx';

interface ITechnique {
  id: string;
  name: string;
  hits: number;
  severity?: Severity;
}

interface ITactic {
  id: string;
  name: string;
  short: string;
  events: number;
  techniques: ITechnique[];
}

// Sample matrix until detections are mapped from live telemetry
const matrix: ITactic[] = [
  {
    id: 'TA0043',
    name: 'Reconnaissance',
    short: 'Reconnaissance',
    events: 1240,
    techniques: [
      { id: 'T1595', name: 'Active Scanning', hits: 0 },
      { id: 'T1592', name: 'Gather Victim Host Information', hits: 2388, severity: 'low' },
      { id: 'T1589', name: 'Gather Victim Identity Information', hits: 0 },
      { id: 'T1590', name: 'Gather Victim Network Information', hits: 0 },
    ],
  },
  {
    id: 'TA0042',
    name: 'Resource Development',
    short: 'Resource Dev',
    events: 842,
    techniques: [
      { id: 'T1583', name: 'Acquire Infrastructure', hits: 0 },
      { id: 'T1586', name: 'Compromise Accounts', hits: 842, severity: 'medium' },
      { id: 'T1584', name: 'Compromise Infrastructure', hits: 0 },
    ],
  },
  {
    id: 'TA0001',
    name: 'Initial Access',
    short: 'Initial Access',
    events: 3105,
    techniques: [
      { id: 'T1189', name: 'Drive-by Compromise', hits: 0 },
      { id: 'T1190', name: 'Exploit Public-Facing App', hits: 2410, severity: 'high' },
      { id: 'T1133', name: 'External Remote Services', hits: 0 },
      { id: 'T1566', name: 'Phishing', hits: 695, severity: 'low' },
      { id: 'T1078', name: 'Valid Accounts', hits: 0 },
    ],
  },
  {
    id: 'TA0002',
    name: 'Execution',
    short: 'Execution',
    events: 1890,
    techniques: [
      { id: 'T1059', name: 'Command and Scripting Interpreter', hits: 0 },
      { id: 'T1053', name: 'Scheduled Task/Job', hits: 1890, severity: 'critical' },
      { id: 'T1204', name: 'User Execution', hits: 0 },
    ],
  },
  {
    id: 'TA0003',
    name: 'Persistence',
    short: 'Persistence',
    events: 412,
    techniques: [
      { id: 'T1098', name: 'Account Manipulation', hits: 0 },
      { id: 'T1136', name: 'Create Account', hits: 412, severity: 'low' },
      { id: 'T1546', name: 'Event Triggered Execution', hits: 0 },
    ],
  },
  {
    id: 'TA0004',
    name: 'Privilege Escalation',
    short: 'Privilege Esc',
    events: 0,
    techniques: [],
  },
  {
    id: 'TA0005',
    name: 'Defense Evasion',
    short: 'Defense Evasion',
    events: 1120,
    techniques: [
      { id: 'T1070', name: 'Indicator Removal', hits: 640, severity: 'medium' },
      { id: 'T1218.011', name: 'Rundll32', hits: 480, severity: 'medium' },
      { id: 'T1027', name: 'Obfuscated Files or Information', hits: 0 },
    ],
  },
  {
    id: 'TA0007',
    name: 'Discovery',
    short: 'Discovery',
    events: 0,
    techniques: [],
  },
];

const cellStyle: Record<Severity, string> = {
  critical: 'border-critical/60 bg-critical/40 text-ink font-semibold',
  high: 'border-high/50 bg-high/30 text-ink font-semibold',
  medium: 'border-line-strong bg-line-strong/70 text-ink',
  low: 'border-line-strong bg-raised text-ink',
};

const dotStyle: Record<Severity, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-low',
};

const timeline: { pos: number; severity: Severity; size: number }[] = [
  { pos: 10, severity: 'low', size: 8 },
  { pos: 26, severity: 'medium', size: 11 },
  { pos: 45, severity: 'low', size: 8 },
  { pos: 62, severity: 'high', size: 13 },
  { pos: 85, severity: 'critical', size: 10 },
];

export const MitreFramework: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [range, setRange] = useState('Last 24 Hours');

  const matches = (t: ITechnique) =>
    `${t.id} ${t.name}`.toLowerCase().includes(filter.toLowerCase());

  return (
    <div>
      <MitreHeader section="Framework" />
      <div className="flex flex-wrap items-center gap-5 border-b border-line px-6 py-3 text-sm">
        <div className="relative">
          <ListFilter className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter techniques..."
            className="h-8 w-56 rounded border border-line-strong bg-canvas pl-8 pr-2 text-xs text-ink placeholder:text-subtle focus:border-accent/60 focus:outline-none"
          />
        </div>
        <Toggle
          checked={hideEmpty}
          onChange={setHideEmpty}
          label={<span className="text-muted">Hide techniques with no alerts</span>}
          className="flex-row-reverse"
        />
        <label className="flex items-center gap-2">
          <MonoLabel>Time range:</MonoLabel>
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="w-36 [&_select]:h-8 [&_select]:text-xs"
          >
            {['Last 1 Hour', 'Last 24 Hours', 'Last 7 Days'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </label>
        <div className="ml-auto flex items-center gap-3 border-l border-line pl-5">
          <MonoLabel>Severity legend:</MonoLabel>
          {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs capitalize text-muted">
              <span className={cn('size-2 rounded-full', dotStyle[s])} />
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-5 p-6">
        <Panel className="bg-raised/50 px-5 py-4">
          <MonoLabel>Activity timeline ({range.toLowerCase()})</MonoLabel>
          <div className="relative mt-5 h-4">
            <span className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
            {timeline.map((p) => (
              <span
                key={p.pos}
                className={cn(
                  'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-canvas/60',
                  dotStyle[p.severity],
                )}
                style={{ left: `${p.pos}%`, width: p.size, height: p.size }}
              />
            ))}
          </div>
        </Panel>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[...matrix]
            .sort((a, b) => b.events - a.events)
            .map((t) => (
              <span
                key={t.id}
                className={cn(
                  'whitespace-nowrap rounded-full border px-3 py-1 text-xs',
                  t.events
                    ? 'border-line-strong bg-raised font-semibold text-ink'
                    : 'border-line text-subtle',
                )}
              >
                {t.short} · {t.events.toLocaleString()}
              </span>
            ))}
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="grid auto-cols-[180px] grid-flow-col gap-2">
            {matrix.map((tactic) => {
              const techniques = tactic.techniques.filter(
                (t) => matches(t) && (!hideEmpty || t.hits > 0),
              );
              return (
                <div key={tactic.id} className="space-y-2">
                  <div className="rounded-sm border border-line bg-raised px-2 py-2 text-center">
                    <p className="font-mono text-[10px] uppercase text-ink">
                      {tactic.short} · {tactic.id}
                    </p>
                    <p className="font-mono text-[11px] text-muted">
                      {tactic.events.toLocaleString()} events
                    </p>
                  </div>
                  {techniques.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-line-strong px-2 py-6 text-center font-mono text-[9px] uppercase text-subtle">
                      No detections
                    </div>
                  ) : (
                    techniques.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => navigate(`/mitre/events?q=${encodeURIComponent(t.id)}`)}
                        className={cn(
                          'relative block w-full rounded-sm border px-2.5 py-2 text-left text-[13px] leading-tight transition-colors hover:border-accent/60',
                          t.severity
                            ? cellStyle[t.severity]
                            : 'border-transparent bg-raised/50 text-muted',
                        )}
                      >
                        <span
                          className={cn(
                            'block font-mono text-[10px]',
                            t.severity === 'critical'
                              ? 'text-critical'
                              : t.severity === 'high'
                                ? 'text-high'
                                : t.severity
                                  ? 'text-accent'
                                  : 'text-subtle',
                          )}
                        >
                          {t.id}
                          {t.hits > 0 && ` — ${t.hits.toLocaleString()}`}
                        </span>
                        {t.name}
                        {t.severity && (
                          <span
                            className={cn(
                              'absolute right-2 top-2 size-1.5 rounded-full',
                              dotStyle[t.severity],
                            )}
                          />
                        )}
                      </button>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
