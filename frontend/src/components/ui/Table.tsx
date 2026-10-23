import React from 'react';
import { cn } from '../../lib/cn.ts';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  ...rest
}) => (
  <div className="w-full overflow-x-auto">
    <table className={cn('w-full border-collapse text-left text-sm', className)} {...rest} />
  </div>
);

export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...rest
}) => <thead className={cn('bg-canvas/50', className)} {...rest} />;

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...rest
}) => (
  <th
    className={cn(
      'whitespace-nowrap border-b border-line px-4 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.5px] text-muted',
      className,
    )}
    {...rest}
  />
);

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }> = ({
  className,
  selected,
  ...rest
}) => (
  <tr
    className={cn(
      'border-b border-line transition-colors last:border-0 hover:bg-raised/60',
      selected && 'bg-raised',
      className,
    )}
    {...rest}
  />
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...rest
}) => <td className={cn('px-4 py-2.5 align-middle text-ink', className)} {...rest} />;

interface IPaginationProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  summary?: React.ReactNode;
}

export const Pagination: React.FC<IPaginationProps> = ({ page, pages, onChange, summary }) => {
  const visible = Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
      <span>{summary}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-2 py-1 hover:text-ink disabled:opacity-40"
        >
          Previous
        </button>
        {visible.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              'size-6 rounded-sm font-mono',
              p === page ? 'bg-low text-white' : 'hover:bg-raised hover:text-ink',
            )}
          >
            {p}
          </button>
        ))}
        {pages > 5 && <span className="px-1">… {pages}</span>}
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="px-2 py-1 hover:text-ink disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};
