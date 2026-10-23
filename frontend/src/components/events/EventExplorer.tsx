import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  Rows3,
  SearchX,
} from 'lucide-react';
import { cn } from '../../lib/cn.ts';
import type { Severity } from '../../lib/severity.ts';
import { severityBg } from '../../lib/severity.ts';
import { Button } from '../ui/Button.tsx';
import { FilterChip, EmptyState } from '../ui/Misc.tsx';
import { SearchInput, Select } from '../ui/Form.tsx';
import { axisProps, chartColors, tooltipProps } from '../charts/theme.ts';

export interface IEventColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

export interface IHistogramBucket {
  label: string;
  value: number;
  tone?: 'normal' | 'high' | 'critical';
}

interface IFilter {
  field: string;
  value: string;
}

interface IEventExplorerProps<T> {
  rows: T[];
  columns: IEventColumn<T>[];
  getId: (row: T) => string;
  // Flattened text used for query + filter matching
  searchText: (row: T) => string;
  getDocument?: (row: T) => Record<string, unknown>;
  rowSeverity?: (row: T) => Severity | undefined;
  histogram: IHistogramBucket[];
  histogramColor?: string;
  histogramTitle?: string;
  initialFilters?: IFilter[];
  initialQuery?: string;
  searchPlaceholder?: string;
  fieldCount?: number;
  leftPanel?: React.ReactNode;
  emptyTitle?: string;
}

const TIME_RANGES = [
  'Last 15 minutes',
  'Last 1 hour',
  'Last 24 hours',
  'Last 7 days',
  'Last 30 days',
];

const toneColor = (tone: IHistogramBucket['tone'], base: string) =>
  tone === 'critical' ? chartColors.critical : tone === 'high' ? chartColors.high : base;

export const EventExplorer = <T,>({
  rows,
  columns,
  getId,
  searchText,
  getDocument,
  rowSeverity,
  histogram,
  histogramColor = chartColors.low,
  histogramTitle = 'Event volume (hits per 30 minutes)',
  initialFilters = [],
  initialQuery = '',
  searchPlaceholder = 'Search events using DQL...',
  fieldCount,
  leftPanel,
  emptyTitle = 'No events found',
}: IEventExplorerProps<T>) => {
  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<IFilter[]>(initialFilters);
  const [range, setRange] = useState('Last 24 hours');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [docView, setDocView] = useState<'table' | 'json'>('table');
  const [compact, setCompact] = useState(false);
  const [addingFilter, setAddingFilter] = useState(false);
  const [newFilter, setNewFilter] = useState('');
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());

  const visible = useMemo(() => {
    const terms = query
      .toLowerCase()
      .split(/\s+(?:and\s+)?/)
      .map((t) => t.replace(/^[\w.]+:/, '').replace(/[*"]/g, ''))
      .filter(Boolean);
    return rows.filter((row) => {
      const text = searchText(row).toLowerCase();
      return (
        terms.every((t) => text.includes(t)) &&
        filters.every((f) => text.includes(f.value.toLowerCase()))
      );
    });
  }, [rows, query, filters, searchText]);

  const toggleRow = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submitFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const [field, ...rest] = newFilter.split(':');
    const value = rest.join(':').trim();
    if (field.trim() && value) setFilters((f) => [...f, { field: field.trim(), value }]);
    setNewFilter('');
    setAddingFilter(false);
  };

  const exportVisible = () => {
    const docs = visible.map((r) => (getDocument ? getDocument(r) : r));
    const blob = new Blob([JSON.stringify(docs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siemple-events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1">
      {leftPanel}
      <div className="min-w-0 flex-1">
        {/* Query bar */}
        <div className="space-y-3 border-b border-line bg-surface/60 px-6 py-4">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(draft);
            }}
          >
            <SearchInput
              mono
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-[260px] flex-1"
              suffix={
                <span className="rounded-sm border border-line-strong px-1.5 py-0.5 font-mono text-[10px] text-muted">
                  DQL
                </span>
              }
            />
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted" />
              <Select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="w-44 [&_select]:pl-8"
              >
                {TIME_RANGES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </div>
            <Button
              type="submit"
              variant="outline"
              icon={<RefreshCw className="size-3.5" />}
              onClick={() => setRefreshedAt(new Date())}
            >
              Refresh
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((f, i) => (
              <FilterChip
                key={`${f.field}-${f.value}-${i}`}
                field={f.field}
                value={f.value}
                onRemove={() => setFilters((all) => all.filter((_, j) => j !== i))}
              />
            ))}
            {addingFilter ? (
              <form onSubmit={submitFilter}>
                <input
                  autoFocus
                  value={newFilter}
                  onChange={(e) => setNewFilter(e.target.value)}
                  onBlur={() => setAddingFilter(false)}
                  placeholder="field: value"
                  className="h-7 w-48 rounded border border-accent/50 bg-canvas px-2 font-mono text-[11px] text-ink focus:outline-none"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingFilter(true)}
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Plus className="size-3.5" /> Add filter
              </button>
            )}
            {filters.length > 0 && (
              <button
                type="button"
                onClick={() => setFilters([])}
                className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Histogram */}
        <div className="border-b border-line px-6 py-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.5px] text-muted">
              {histogramTitle}
            </span>
            <span className="text-sm">
              <span className="text-lg font-semibold text-ink">
                {visible.length.toLocaleString()}
              </span>{' '}
              <span className="text-muted">hits</span>
            </span>
          </div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={visible.length ? histogram : histogram.map((b) => ({ ...b, value: 0 }))}
                barCategoryGap={4}
              >
                <CartesianGrid vertical={false} stroke={chartColors.grid} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={30} />
                <YAxis {...axisProps} width={32} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="value" radius={[1, 1, 0, 0]}>
                  {histogram.map((b) => (
                    <Cell key={b.label} fill={toneColor(b.tone, histogramColor)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-center font-mono text-[10px] text-subtle">
            {range} · refreshed {refreshedAt.toLocaleTimeString()}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-2 text-xs text-muted">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={exportVisible}
              className="inline-flex items-center gap-1.5 hover:text-ink"
            >
              <Download className="size-3.5" /> Export
            </button>
            {fieldCount !== undefined && <span>{fieldCount} available fields</span>}
          </div>
          <div className="flex items-center gap-4">
            <span>
              Showing {Math.min(visible.length, 50)} of {visible.length.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => setCompact((c) => !c)}
              className="inline-flex items-center gap-1.5 hover:text-ink"
            >
              <Rows3 className="size-3.5" /> Density: {compact ? 'compact' : 'normal'}
            </button>
          </div>
        </div>

        {/* Results */}
        {visible.length === 0 ? (
          <div className="px-6 py-16">
            <EmptyState
              icon={<SearchX className="size-5" />}
              title={emptyTitle}
              description={`Your current query and filter combination yielded 0 results over the ${range.toLowerCase()}.`}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFilters([]);
                    setDraft('');
                    setQuery('');
                  }}
                >
                  Clear all filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface">
                <tr className="border-b border-line">
                  <th className="w-10" />
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className="whitespace-nowrap px-3 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.5px] text-muted"
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 50).map((row) => {
                  const id = getId(row);
                  const open = expanded.has(id);
                  const sev = rowSeverity?.(row);
                  const doc = getDocument?.(row);
                  return (
                    <React.Fragment key={id}>
                      <tr
                        onClick={() => doc && toggleRow(id)}
                        className={cn(
                          'border-b border-line transition-colors hover:bg-raised/50',
                          doc && 'cursor-pointer',
                          open && 'bg-raised/60',
                        )}
                      >
                        <td className={cn('relative w-10 pl-4', compact ? 'py-1.5' : 'py-2.5')}>
                          {sev && (
                            <span
                              className={cn('absolute inset-y-1 left-0 w-0.5', severityBg[sev])}
                            />
                          )}
                          {doc &&
                            (open ? (
                              <ChevronDown className="size-3.5 text-muted" />
                            ) : (
                              <ChevronRight className="size-3.5 text-muted" />
                            ))}
                        </td>
                        {columns.map((c) => (
                          <td
                            key={c.key}
                            className={cn(
                              'px-3 align-middle text-ink',
                              compact ? 'py-1.5' : 'py-2.5',
                              c.className,
                            )}
                          >
                            {c.render(row)}
                          </td>
                        ))}
                      </tr>
                      {open && doc && (
                        <tr className="border-b border-line bg-canvas/60">
                          <td />
                          <td colSpan={columns.length} className="px-3 py-4">
                            <div className="flex gap-6">
                              <div className="w-32 shrink-0 space-y-1">
                                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.5px] text-muted">
                                  Document
                                </p>
                                {(['table', 'json'] as const).map((v) => (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => setDocView(v)}
                                    className={cn(
                                      'block w-full rounded-sm px-2 py-1 text-left font-mono text-xs uppercase',
                                      docView === v
                                        ? 'bg-raised text-ink'
                                        : 'text-muted hover:text-ink',
                                    )}
                                  >
                                    {v}
                                  </button>
                                ))}
                              </div>
                              <div className="min-w-0 flex-1 border-l border-line pl-6">
                                {docView === 'table' ? (
                                  <dl className="grid grid-cols-[minmax(160px,220px)_1fr] gap-x-6 gap-y-1.5 font-mono text-xs">
                                    {Object.entries(doc).map(([k, v]) => (
                                      <React.Fragment key={k}>
                                        <dt className="text-muted">{k}</dt>
                                        <dd
                                          className={cn(
                                            'break-all text-ink',
                                            k === 'rule.level' && 'text-critical',
                                          )}
                                        >
                                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                        </dd>
                                      </React.Fragment>
                                    ))}
                                  </dl>
                                ) : (
                                  <pre className="max-h-80 overflow-auto rounded border border-line bg-canvas p-3 font-mono text-xs leading-5 text-ink">
                                    {JSON.stringify(doc, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
