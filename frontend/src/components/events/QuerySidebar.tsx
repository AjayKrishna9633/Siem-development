import React from 'react';
import { cn } from '../../lib/cn.ts';

interface IQuerySidebarProps {
  onReset: () => void;
  children: React.ReactNode;
  className?: string;
}

// Left "QUERY PARAMETERS" filter rail used by the Malware and FIM event views
export const QuerySidebar: React.FC<IQuerySidebarProps> = ({ onReset, children, className }) => (
  <aside className={cn('w-60 shrink-0 border-r border-line bg-raised/60', className)}>
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.5px] text-ink">
        Query parameters
      </span>
      <button
        type="button"
        onClick={onReset}
        className="font-mono text-[10px] uppercase text-muted hover:text-ink"
      >
        Reset
      </button>
    </div>
    <div className="space-y-5 p-4">{children}</div>
  </aside>
);

export const QuerySection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="space-y-2">
    <p className="font-mono text-[10px] uppercase tracking-[0.5px] text-muted">{title}</p>
    {children}
  </div>
);
