import React from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { MonoLabel } from '../ui/Panel.tsx';
import { SearchInput, Select } from '../ui/Form.tsx';
import { cn } from '@/lib/cn.ts';

export interface IPaging {
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  setPage: (page: number) => void;
}

interface IListToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  loading: boolean;
  onRefresh: () => void;
  paging: IPaging;
  children?: React.ReactNode;
}

export const ListToolbar: React.FC<IListToolbarProps> = ({
  search,
  onSearch,
  placeholder,
  loading,
  onRefresh,
  paging,
  children,
}) => (
  <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
    <SearchInput
      mono
      value={search}
      onChange={(e) => {
        onSearch(e.target.value);
        paging.setPage(1);
      }}
      placeholder={placeholder}
      className="w-64 [&_input]:h-8 [&_input]:uppercase"
    />
    {children && <span className="h-6 w-px bg-line-strong" />}
    {children}
    <div className="ml-auto flex items-center gap-2 font-mono text-[11px] text-muted">
      <button
        type="button"
        onClick={onRefresh}
        className="mr-2 hover:text-ink"
        aria-label="Refresh"
      >
        <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
      </button>
      {paging.total ? `${paging.from}-${paging.to}` : '0'} of {paging.total}
      <button
        type="button"
        disabled={paging.page <= 1}
        onClick={() => paging.setPage(paging.page - 1)}
        className="hover:text-ink disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        disabled={paging.page >= paging.pages}
        onClick={() => paging.setPage(paging.page + 1)}
        className="hover:text-ink disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  </div>
);

interface IFilterSelectProps<T extends string> {
  label: string;
  value: 'all' | T;
  allLabel: string;
  options: { value: T; label: string }[];
  onChange: (value: 'all' | T) => void;
  className?: string;
}

export const FilterSelect = <T extends string>({
  label,
  value,
  allLabel,
  options,
  onChange,
  className = 'w-36',
}: IFilterSelectProps<T>) => (
  <label className="flex items-center gap-2">
    <MonoLabel>{label}:</MonoLabel>
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as 'all' | T)}
      className={cn(className, '[&_select]:h-8 [&_select]:text-xs')}
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  </label>
);
