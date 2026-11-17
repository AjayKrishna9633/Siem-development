import React from 'react';
import { cn } from '@/lib/cn.ts';

interface IPanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article';
}

export const Panel: React.FC<IPanelProps> = ({ as: Tag = 'section', className, ...rest }) => (
  <Tag className={cn('relative rounded border border-line bg-surface', className)} {...rest} />
);

interface IPanelHeaderProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PanelHeader: React.FC<IPanelHeaderProps> = ({
  title,
  icon,
  subtitle,
  actions,
  className,
}) => (
  <header
    className={cn(
      'flex items-center justify-between gap-3 border-b border-line px-4 py-3',
      className,
    )}
  >
    <div className="min-w-0">
      <h3 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.5px] text-muted">
        {icon}
        {title}
      </h3>
      {subtitle && <p className="mt-0.5 text-[11px] text-subtle">{subtitle}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </header>
);

export const FloatingLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-line bg-canvas px-3 pt-1 pb-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-muted">
    {children}
  </div>
);

export const SectionDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex justify-center">
    <span className="rounded-xl border border-line bg-canvas px-4 py-0.5 font-mono text-[11px] uppercase text-muted">
      {label}
    </span>
  </div>
);

export const MonoLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span className={cn('font-mono text-[10px] uppercase tracking-[0.5px] text-muted', className)}>
    {children}
  </span>
);
