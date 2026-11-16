import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Input, SearchInput, Segmented } from '@/components/ui/Form.tsx';
import { MonoLabel } from '@/components/ui/Panel.tsx';
import { FilterSelect } from '@/components/common/ListToolbar.tsx';
import { useDebounced } from '@/hooks/useDebounced.ts';
import { cn } from '@/lib/cn.ts';
import { CATEGORY_OPTIONS, OUTCOME_OPTIONS, RANGE_OPTIONS } from '../constants/actionLabels.ts';
import { MAX_SEARCH_LENGTH, isoToLocalInput, localInputToIso } from '../utils/filters.ts';
import type { AuditCategory, AuditOutcome, IAuditFilters } from '../types/audit.types.ts';

export interface IActorOption {
  id: string;
  label: string;
}

interface IAuditFiltersProps {
  filters: IAuditFilters;
  onChange: (patch: Partial<IAuditFilters>) => void;
  onClear: () => void;
  onRefresh: () => void;
  actors: IActorOption[];
  loading: boolean;
  hasActiveFilters: boolean;
  rangeError: string | null;
}

export const AuditFilters: React.FC<IAuditFiltersProps> = ({
  filters,
  onChange,
  onClear,
  onRefresh,
  actors,
  loading,
  hasActiveFilters,
  rangeError,
}) => {
  const [text, setText] = useState(filters.q ?? '');
  const debounced = useDebounced(text.trim());

  // Typing waits for a pause before it reaches the URL (and so the API).
  useEffect(() => {
    if (debounced !== (filters.q ?? '')) onChange({ q: debounced || undefined });
    // `filters.q` is deliberately not a dependency: the URL following the input must not loop
    // back into it, and an external change (Clear) is handled by clear() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const clear = () => {
    setText('');
    onClear();
  };

  return (
    <div className="border-b border-line">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-2" role="group" aria-label="Date range">
          <MonoLabel>Range:</MonoLabel>
          <Segmented
            options={RANGE_OPTIONS}
            value={filters.range}
            onChange={(range) => onChange({ range })}
          />
        </div>
        <span className="h-6 w-px bg-line-strong" />
        <FilterSelect
          label="Category"
          allLabel="All"
          value={filters.category ?? 'all'}
          options={CATEGORY_OPTIONS}
          onChange={(v) => onChange({ category: v === 'all' ? undefined : (v as AuditCategory) })}
        />
        <FilterSelect
          label="Outcome"
          allLabel="All"
          value={filters.outcome ?? 'all'}
          options={OUTCOME_OPTIONS}
          onChange={(v) => onChange({ outcome: v === 'all' ? undefined : (v as AuditOutcome) })}
        />
        <FilterSelect
          label="Actor"
          allLabel="Anyone"
          value={filters.actorId ?? 'all'}
          options={actors.map((a) => ({ value: a.id, label: a.label }))}
          className="w-48"
          onChange={(v) => onChange({ actorId: v === 'all' ? undefined : v })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 px-3 pb-3">
        <SearchInput
          mono
          value={text}
          maxLength={MAX_SEARCH_LENGTH}
          onChange={(e) => setText(e.target.value)}
          placeholder="SEARCH ACTOR, TARGET OR ACTION..."
          aria-label="Search the audit log"
          className="w-80 [&_input]:h-8 [&_input]:uppercase"
        />
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clear}>
            Clear filters
          </Button>
        )}
        <button
          type="button"
          onClick={onRefresh}
          className="ml-auto text-muted hover:text-ink"
          aria-label="Refresh"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {filters.range === 'custom' && (
        <div className="flex flex-wrap items-start gap-3 px-3 pb-3">
          <label className="flex items-center gap-2">
            <MonoLabel>From:</MonoLabel>
            <Input
              type="datetime-local"
              aria-label="From"
              value={isoToLocalInput(filters.from)}
              invalid={!!rangeError}
              onChange={(e) => onChange({ from: localInputToIso(e.target.value) })}
              className="h-8 w-52 text-xs"
            />
          </label>
          <label className="flex items-center gap-2">
            <MonoLabel>To:</MonoLabel>
            <Input
              type="datetime-local"
              aria-label="To"
              value={isoToLocalInput(filters.to)}
              invalid={!!rangeError}
              onChange={(e) => onChange({ to: localInputToIso(e.target.value) })}
              className="h-8 w-52 text-xs"
            />
          </label>
          {rangeError ? (
            <p role="alert" className="self-center text-xs text-high">
              {rangeError}
            </p>
          ) : (
            <p className="self-center text-xs text-subtle">
              Up to 90 days. Leave “To” empty for now.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
