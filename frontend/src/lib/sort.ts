export type SortDirection = 'asc' | 'desc';

// One sortable column: how to read its value, and what kind of value it is so the
// direction can be labelled "A → Z", "0 → 9" or "Oldest first"
export interface ISortField<T, K extends string = string> {
  value: K;
  label: string;
  kind: 'text' | 'number' | 'date';
  get: (item: T) => string | number | null | undefined;
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

const toComparable = (
  raw: string | number | null | undefined,
  kind: ISortField<unknown>['kind'],
) => {
  if (raw === null || raw === undefined || raw === '') return null;
  if (kind === 'date') {
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return raw;
};

// Case-insensitive and number-aware ("Team 2" before "Team 10"). Empty values always
// go last, whichever direction is chosen, so "never logged in" never crowds the top.
export const sortItems = <T>(items: T[], field: ISortField<T>, direction: SortDirection): T[] => {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = toComparable(field.get(a), field.kind);
    const vb = toComparable(field.get(b), field.kind);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    const diff =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : collator.compare(String(va), String(vb));
    return diff * factor;
  });
};

export const directionLabel = (kind: ISortField<unknown>['kind'], direction: SortDirection) => {
  const labels = {
    text: { asc: 'A → Z', desc: 'Z → A' },
    number: { asc: 'Low → High', desc: 'High → Low' },
    date: { asc: 'Oldest first', desc: 'Newest first' },
  };
  return labels[kind][direction];
};
