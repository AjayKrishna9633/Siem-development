export type SortDirection = 'asc' | 'desc';

export interface ISortField<K extends string = string> {
  value: K;
  label: string;
  kind: 'text' | 'number' | 'date';
}

export const directionLabel = (kind: ISortField['kind'], direction: SortDirection) => {
  const labels = {
    text: { asc: 'A → Z', desc: 'Z → A' },
    number: { asc: 'Low → High', desc: 'High → Low' },
    date: { asc: 'Oldest first', desc: 'Newest first' },
  };
  return labels[kind][direction];
};
