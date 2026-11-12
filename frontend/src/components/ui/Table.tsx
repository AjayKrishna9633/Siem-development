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
