import React from 'react';
import { cn } from '../../lib/cn.ts';

type KpiTone = 'default' | 'critical' | 'high' | 'medium' | 'low' | 'neutral';

interface IKpiCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  delta?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: KpiTone;
  // Highlighted cards get a tinted background and left accent bar
  highlight?: boolean;
  outlined?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const valueTone: Record<KpiTone, string> = {
  default: 'text-ink',
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-low',
  neutral: 'text-muted',
};

const borderTone: Record<KpiTone, string> = {
  default: 'border-line',
  critical: 'border-critical/70',
  high: 'border-high/70',
  medium: 'border-medium/70',
  low: 'border-low/70',
  neutral: 'border-line-strong',
};

export const KpiCard: React.FC<IKpiCardProps> = ({
  label,
  value,
  icon,
  delta,
  footer,
  tone = 'default',
  highlight,
  outlined,
  className,
  children,
}) => (
  <div
    className={cn(
      'relative flex flex-col gap-3 overflow-hidden rounded border bg-surface p-4',
      outlined ? borderTone[tone] : 'border-line',
      highlight && 'bg-critical/10',
      className,
    )}
  >
    {highlight && <span className="absolute inset-y-0 left-0 w-1 bg-critical" />}
    <div className="flex items-start justify-between gap-2">
      <span
        className={cn(
          'font-mono text-[11px] uppercase tracking-[0.5px]',
          highlight ? 'text-critical' : 'text-muted',
        )}
      >
        {label}
      </span>
      {icon && (
        <span className={cn('shrink-0', highlight ? 'text-critical' : 'text-muted')}>{icon}</span>
      )}
    </div>
    <div className="flex items-end justify-between gap-2">
      <span className={cn('text-[28px] leading-8 font-medium', valueTone[tone])}>{value}</span>
      {delta}
    </div>
    {children}
    {footer && <div className="text-xs text-muted">{footer}</div>}
  </div>
);

interface IDeltaProps {
  value: string;
  direction: 'up' | 'down' | 'flat';
  // Whether "up" is bad (alerts) or good (patch rate)
  upIsBad?: boolean;
}

export const Delta: React.FC<IDeltaProps> = ({ value, direction, upIsBad = true }) => {
  const bad = direction === 'flat' ? null : (direction === 'up') === upIsBad;
  return (
    <span
      className={cn(
        'font-mono text-[11px]',
        bad === null ? 'text-muted' : bad ? 'text-high' : 'text-low',
      )}
    >
      {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'}
      {value}
    </span>
  );
};
