import React from 'react';
import { cn } from '@/lib/cn.ts';
import type { Severity } from '@/lib/severity.ts';

const solid: Record<Severity, string> = {
  critical: 'bg-critical text-white',
  high: 'bg-high text-canvas',
  medium: 'bg-medium text-canvas',
  low: 'bg-low text-white',
};

const outline: Record<Severity, string> = {
  critical: 'border-critical/60 bg-critical/10 text-critical',
  high: 'border-high/60 bg-high/10 text-high',
  medium: 'border-medium/60 bg-medium/10 text-medium',
  low: 'border-low/60 bg-low/10 text-low',
};

interface ISeverityBadgeProps {
  severity: Severity;
  variant?: 'solid' | 'outline';
  label?: string;
  className?: string;
}

export const SeverityBadge: React.FC<ISeverityBadgeProps> = ({
  severity,
  variant = 'solid',
  label,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase leading-4 tracking-[0.5px]',
      variant === 'solid' ? solid[severity] : cn('border', outline[severity]),
      className,
    )}
  >
    {label ?? severity}
  </span>
);

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'accent';

const toneClasses: Record<Tone, string> = {
  success: 'border-success/40 bg-success/10 text-success',
  danger: 'border-critical/50 bg-critical/10 text-critical',
  warning: 'border-medium/50 bg-medium/10 text-medium',
  info: 'border-low/50 bg-low/10 text-low',
  neutral: 'border-line-strong bg-raised text-muted',
  accent: 'border-accent/40 bg-accent/10 text-accent',
};

const toneDot: Record<Tone, string> = {
  success: 'bg-success',
  danger: 'bg-critical',
  warning: 'bg-medium',
  info: 'bg-low',
  neutral: 'bg-subtle',
  accent: 'bg-accent',
};

interface IStatusBadgeProps {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<IStatusBadgeProps> = ({ tone, children, dot, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase leading-4 tracking-[0.5px]',
      toneClasses[tone],
      className,
    )}
  >
    {dot && <span className={cn('size-1.5 rounded-full', toneDot[tone])} />}
    {children}
  </span>
);

export const StatusDot: React.FC<{ tone: Tone; children: React.ReactNode; className?: string }> = ({
  tone,
  children,
  className,
}) => (
  <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
    <span className={cn('size-2 rounded-full', toneDot[tone])} />
    {children}
  </span>
);

export const Tag: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-sm border border-line-strong bg-canvas/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-muted',
      className,
    )}
  >
    {children}
  </span>
);

export const CodeChip: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-sm border border-line-strong bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-ink',
      className,
    )}
  >
    {children}
  </span>
);
