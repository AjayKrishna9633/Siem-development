import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { MonoLabel } from '../ui/Panel.tsx';
import { Select } from '../ui/Form.tsx';
import { directionLabel, type ISortField, type SortDirection } from '../../lib/sort.ts';

interface ISortControlProps<T, K extends string> {
  fields: ISortField<T, K>[];
  field: K;
  direction: SortDirection;
  onFieldChange: (field: K) => void;
  onDirectionChange: (direction: SortDirection) => void;
}

// "Sort by: [Name ▾] [A → Z]" for a list toolbar; the button flips the direction
export const SortControl = <T, K extends string>({
  fields,
  field,
  direction,
  onFieldChange,
  onDirectionChange,
}: ISortControlProps<T, K>) => {
  const kind = fields.find((f) => f.value === field)?.kind ?? 'text';
  const next = direction === 'asc' ? 'desc' : 'asc';

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2">
        <MonoLabel>Sort by:</MonoLabel>
        <Select
          value={field}
          onChange={(e) => onFieldChange(e.target.value as K)}
          className="w-36 [&_select]:h-8 [&_select]:text-xs"
          aria-label="Sort by"
        >
          {fields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </label>
      <button
        type="button"
        onClick={() => onDirectionChange(next)}
        title={`Switch to ${directionLabel(kind, next)}`}
        aria-label={`Sort direction: ${directionLabel(kind, direction)}. Switch to ${directionLabel(kind, next)}`}
        className="flex h-8 items-center gap-1.5 rounded border border-line-strong bg-canvas px-2.5 text-xs text-ink transition-colors hover:border-accent/60 hover:text-accent"
      >
        {direction === 'asc' ? (
          <ArrowUpNarrowWide className="size-3.5" />
        ) : (
          <ArrowDownWideNarrow className="size-3.5" />
        )}
        {directionLabel(kind, direction)}
      </button>
    </div>
  );
};
