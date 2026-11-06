import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn.ts';

interface ISvgIconProps {
  src: string;
  width: number;
  height: number;
  className?: string;
}

export const SvgIcon: React.FC<ISvgIconProps> = ({ src, width, height, className }) => (
  <span
    aria-hidden
    className={cn('inline-block shrink-0 bg-current', className)}
    style={{
      width,
      height,
      maskImage: `url("${src}")`,
      WebkitMaskImage: `url("${src}")`,
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
    }}
  />
);

interface IFilterChipProps {
  field?: string;
  value: React.ReactNode;
  onRemove?: () => void;
  tone?: 'default' | 'critical' | 'high' | 'accent';
}

const chipTone = {
  default: 'border-line-strong bg-raised text-ink',
  critical: 'border-critical/50 bg-critical/10 text-critical',
  high: 'border-high/50 bg-high/10 text-high',
  accent: 'border-accent/40 bg-accent/10 text-accent',
};

export const FilterChip: React.FC<IFilterChipProps> = ({
  field,
  value,
  onRemove,
  tone = 'default',
}) => (
  <span
    className={cn(
      'inline-flex h-7 items-center gap-1.5 rounded border px-2 font-mono text-[11px]',
      chipTone[tone],
    )}
  >
    {field && <span className="text-muted">{field}:</span>}
    <span className="font-medium">{value}</span>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="text-muted hover:text-ink"
      >
        <X className="size-3" />
      </button>
    )}
  </span>
);

interface IEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<IEmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="mx-auto flex max-w-sm flex-col items-center rounded border border-line bg-surface px-8 py-8 text-center">
    <span className="mb-4 flex size-12 items-center justify-center rounded-lg bg-raised text-muted">
      {icon}
    </span>
    <h3 className="text-sm font-medium text-ink">{title}</h3>
    <p className="mt-2 text-sm text-muted">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Avatar: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const initials = name
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised font-mono text-[10px] text-muted',
        className,
      )}
    >
      {initials || '?'}
    </span>
  );
};

export const Meter: React.FC<{
  value: number;
  max: number;
  color?: string;
  className?: string;
}> = ({ value, max, color = '#818cf8', className }) => (
  <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-raised', className)}>
    <div
      className="h-full rounded-full"
      style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}
    />
  </div>
);

export const SampleDataBanner: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'flex items-start gap-3 rounded border border-medium/30 bg-medium/5 px-4 py-3 text-sm',
      className,
    )}
  >
    <span className="mt-0.5 size-2 shrink-0 rounded-full bg-medium" />
    <div>
      <p className="font-medium text-medium">This view shows sample data</p>
      <p className="mt-0.5 text-xs text-muted">
        Telemetry ingestion is not wired up yet. Figures here are placeholders until the ingest API
        lands.
      </p>
    </div>
  </div>
);
