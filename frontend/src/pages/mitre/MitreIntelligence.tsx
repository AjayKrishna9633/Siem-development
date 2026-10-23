import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ListFilter, TriangleAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button.tsx';
import { SearchInput, Segmented, Select } from '../../components/ui/Form.tsx';
import { MonoLabel, Panel } from '../../components/ui/Panel.tsx';
import { cn } from '../../lib/cn.ts';
import { MitreHeader } from './MitreHeader.tsx';

type MatchLevel = 'critical' | 'elevated' | 'low';

interface IActor {
  name: string;
  alias: string;
  origin: string;
  overlap: number;
  level: MatchLevel;
  summary: string;
  techniques: { id: string; name: string }[];
  more?: number;
}

// Sample correlation output until the intel feed is wired up
const actors: IActor[] = [
  {
    name: 'APT29',
    alias: 'Cozy Bear',
    origin: 'Russian Foreign Intelligence Service (SVR)',
    overlap: 70,
    level: 'critical',
    summary:
      'Known for stealthy, long-term espionage campaigns. Current environmental artifacts heavily mirror their use of compromised credentials to move laterally (T1078) and exfiltration over alternative protocols (T1048) to bypass standard perimeter alerting.',
    techniques: [
      { id: 'T1078', name: 'Valid Accounts' },
      { id: 'T1003.001', name: 'LSASS Memory' },
      { id: 'T1048', name: 'Exfiltration Over Alternative Protocol' },
      { id: 'T1059.001', name: 'PowerShell' },
    ],
    more: 3,
  },
  {
    name: 'FIN7',
    alias: '',
    origin: 'Financially Motivated Cybercrime Group',
    overlap: 45,
    level: 'elevated',
    summary:
      'Historically targets retail and hospitality. The presence of specific spearphishing attachment payloads (T1193) and scheduled task creation for persistence (T1053) show partial alignment, though subsequent post-exploitation actions diverge.',
    techniques: [
      { id: 'T1566.001', name: 'Spearphishing Attachment' },
      { id: 'T1053.005', name: 'Scheduled Task' },
    ],
  },
  {
    name: 'Lazarus Group',
    alias: '',
    origin: 'North Korean State-Sponsored',
    overlap: 15,
    level: 'low',
    summary:
      'Minimal overlap observed. Common living-off-the-land techniques match generic behavior, but highly specific bespoke malware indicators associated with Lazarus are entirely absent from current telemetry.',
    techniques: [{ id: 'T1059.003', name: 'Windows Command Shell' }],
  },
];

const levelStyle: Record<MatchLevel, { bar: string; text: string; badge: string; label: string }> =
  {
    critical: {
      bar: 'bg-high',
      text: 'text-high',
      badge: 'bg-high text-canvas',
      label: 'Critical match',
    },
    elevated: {
      bar: 'bg-medium',
      text: 'text-medium',
      badge: 'bg-medium text-canvas',
      label: 'Elevated match',
    },
    low: { bar: 'bg-low', text: 'text-low', badge: 'bg-low text-white', label: 'Low match' },
  };

const sections = [
  'Correlation',
  'Groups',
  'Mitigations',
  'Software',
  'Tactics',
  'Techniques',
] as const;
type Section = (typeof sections)[number];

const reference: Record<
  Exclude<Section, 'Correlation'>,
  { id: string; name: string; detail: string }[]
> = {
  Groups: [
    { id: 'G0016', name: 'APT29', detail: 'Russia · espionage' },
    { id: 'G0046', name: 'FIN7', detail: 'Cybercrime · retail' },
    { id: 'G0032', name: 'Lazarus Group', detail: 'DPRK · financial / espionage' },
    { id: 'G0007', name: 'APT28', detail: 'Russia · GRU' },
  ],
  Mitigations: [
    { id: 'M1026', name: 'Privileged Account Management', detail: 'Mitigates T1078, T1003' },
    { id: 'M1032', name: 'Multi-factor Authentication', detail: 'Mitigates T1078, T1110' },
    { id: 'M1038', name: 'Execution Prevention', detail: 'Mitigates T1059' },
  ],
  Software: [
    { id: 'S0002', name: 'Mimikatz', detail: 'Credential dumping tool' },
    { id: 'S0154', name: 'Cobalt Strike', detail: 'Post-exploitation framework' },
  ],
  Tactics: [
    { id: 'TA0001', name: 'Initial Access', detail: '3,105 events' },
    { id: 'TA0002', name: 'Execution', detail: '1,890 events' },
    { id: 'TA0005', name: 'Defense Evasion', detail: '1,120 events' },
  ],
  Techniques: [
    { id: 'T1078', name: 'Valid Accounts', detail: '28% of mapped events' },
    { id: 'T1059', name: 'Command and Scripting Interpreter', detail: '42% of mapped events' },
    { id: 'T1003.001', name: 'LSASS Memory', detail: '6% of mapped events' },
  ],
};

const density = [
  ['#ea580c', '#9a4a1f', '#3f3f46', '#111827'],
  ['#f97316', '#9a4a1f', '#4a3a30', '#111827'],
  ['#9a4a1f', '#111827', '#111827', '#111827'],
];

const iocs = [
  { value: '185.15.22.4 (C2)', hits: 42, tone: 'text-high' },
  { value: 'lsass_dump.exe', hits: 15, tone: 'text-medium' },
  { value: 'update_svc.bat', hits: 8, tone: 'text-low' },
];

export const MitreIntelligence: React.FC = () => {
  const [section, setSection] = useState<Section>('Correlation');
  const [lookback, setLookback] = useState<'24H' | '7D' | '30D'>('7D');
  const [sort, setSort] = useState<'overlap' | 'name'>('overlap');
  const [search, setSearch] = useState('');

  const sortedActors = useMemo(
    () =>
      [...actors].sort((a, b) =>
        sort === 'overlap' ? b.overlap - a.overlap : a.name.localeCompare(b.name),
      ),
    [sort],
  );

  return (
    <div>
      <MitreHeader section="Intelligence" />
      <div className="flex min-h-[calc(100vh-12rem)]">
        <aside className="w-56 shrink-0 border-r border-line">
          <div className="p-3">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in all resources..."
              className="[&_input]:h-8 [&_input]:text-xs"
            />
          </div>
          <nav>
            {sections.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={cn(
                  'block w-full px-4 py-2.5 text-left text-sm transition-colors',
                  section === s ? 'bg-raised text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {s}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-6 p-6">
          {section === 'Correlation' ? (
            <>
              <Panel className="flex flex-wrap items-center justify-between gap-4 bg-raised/60 p-5">
                <div className="max-w-2xl">
                  <MonoLabel className="flex items-center gap-2 text-high">
                    <TriangleAlert className="size-3.5" /> Threat actor correlation
                  </MonoLabel>
                  <h2 className="mt-2 text-lg font-semibold text-ink">
                    Techniques observed match <span className="text-high">70%</span> of known APT29
                    TTPs
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Recent telemetry across domain controllers and external-facing assets shows a
                    high structural overlap with established Cozy Bear operational patterns,
                    specifically concerning initial access vectors and credential dumping.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link to="/mitre/events">
                    <Button variant="secondary">View Raw Events</Button>
                  </Link>
                  <Button variant="primary">Generate Report</Button>
                </div>
              </Panel>

              <div className="grid gap-6 xl:grid-cols-[1fr_260px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <MonoLabel>Matched threat actor profiles</MonoLabel>
                    <label className="flex items-center gap-2">
                      <MonoLabel>Sort by:</MonoLabel>
                      <Select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as 'overlap' | 'name')}
                        className="w-36 [&_select]:h-8 [&_select]:font-mono [&_select]:text-xs"
                      >
                        <option value="overlap">Overlap %</option>
                        <option value="name">Name</option>
                      </Select>
                    </label>
                  </div>

                  {sortedActors
                    .filter((a) =>
                      `${a.name} ${a.alias} ${a.origin}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((a) => {
                      const s = levelStyle[a.level];
                      return (
                        <Panel
                          key={a.name}
                          as="article"
                          className="overflow-hidden bg-raised/50 p-5 pl-6"
                        >
                          <span className={cn('absolute inset-y-0 left-0 w-1', s.bar)} />
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="flex flex-wrap items-center gap-3 text-lg font-medium text-ink">
                                {a.name} {a.alias && `(${a.alias})`}
                                <span
                                  className={cn(
                                    'rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase',
                                    s.badge,
                                  )}
                                >
                                  {s.label}
                                </span>
                              </h3>
                              <p className="mt-0.5 font-mono text-[11px] text-subtle">{a.origin}</p>
                            </div>
                            <div className="text-right">
                              <p className={cn('text-2xl font-semibold', s.text)}>{a.overlap}%</p>
                              <MonoLabel className="text-[9px]">TTP overlap</MonoLabel>
                            </div>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-ink/90">{a.summary}</p>
                          <MonoLabel className="mt-4 block">
                            Observed techniques (correlated)
                          </MonoLabel>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {a.techniques.map((t) => (
                              <span
                                key={t.id}
                                className="rounded-sm border border-line-strong bg-canvas px-2 py-1 text-xs text-ink"
                              >
                                <span className="mr-1.5 font-mono text-accent">{t.id}</span>
                                {t.name}
                              </span>
                            ))}
                            {a.more && (
                              <span className="rounded-sm border border-dashed border-line-strong px-2 py-1 text-xs text-muted">
                                +{a.more} more
                              </span>
                            )}
                          </div>
                        </Panel>
                      );
                    })}
                </div>

                <Panel className="h-fit">
                  <header className="flex items-center justify-between border-b border-line px-4 py-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.5px] text-ink">
                      Analysis context
                    </span>
                    <ListFilter className="size-4 text-muted" />
                  </header>
                  <div className="space-y-5 p-4">
                    <div className="space-y-2">
                      <MonoLabel>Lookback window</MonoLabel>
                      <Segmented
                        options={['24H', '7D', '30D'] as const}
                        value={lookback}
                        onChange={setLookback}
                        className="grid w-full grid-cols-3"
                      />
                    </div>
                    <div className="space-y-2 border-t border-line pt-4">
                      <MonoLabel>Tactic density matrix</MonoLabel>
                      <div className="grid grid-cols-4 gap-1">
                        {density.flat().map((c, i) => (
                          <span
                            key={i}
                            className="h-5 rounded-sm border border-line"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between font-mono text-[9px] text-subtle">
                        <span>High vol</span>
                        <span>Low vol</span>
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-line pt-4">
                      <MonoLabel>Top driving IOCs</MonoLabel>
                      {iocs.map((ioc) => (
                        <div key={ioc.value} className="flex justify-between font-mono text-xs">
                          <span className="text-ink">{ioc.value}</span>
                          <span className={ioc.tone}>{ioc.hits} hits</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>
              </div>
            </>
          ) : (
            <Panel>
              <header className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
                {section}
              </header>
              <ul>
                {reference[section]
                  .filter((r) => `${r.id} ${r.name}`.toLowerCase().includes(search.toLowerCase()))
                  .map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-0"
                    >
                      <span className="w-20 font-mono text-xs text-accent">{r.id}</span>
                      <span className="flex-1 text-sm text-ink">{r.name}</span>
                      <span className="text-xs text-muted">{r.detail}</span>
                    </li>
                  ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
};
