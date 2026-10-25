import React from 'react';
import { cn } from '../../lib/cn.ts';

// Full-width row for "Loading…" or "Nothing here" inside a table body
export const TableStatusRow: React.FC<{
  colSpan: number;
  children: React.ReactNode;
  mono?: boolean;
}> = ({ colSpan, children, mono }) => (
  <tr>
    <td
      colSpan={colSpan}
      className={cn('px-4 py-12 text-center text-muted', mono ? 'font-mono text-xs' : 'text-sm')}
    >
      {children}
    </td>
  </tr>
);
