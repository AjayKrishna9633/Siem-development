import React from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/cn.ts';
import { Breadcrumbs, type ICrumb } from './PageHeader.tsx';
import { Tag } from './Badge.tsx';

interface IHubLayoutProps {
  title: string;
  description: string;
  crumbs?: ICrumb[];
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Landing page for a module: centered title + module cards
export const HubLayout: React.FC<IHubLayoutProps> = ({
  title,
  description,
  crumbs,
  eyebrow,
  children,
  footer,
}) => (
  <div className="relative min-h-full overflow-hidden">
    <div className="pointer-events-none absolute left-1/2 top-40 size-[640px] -translate-x-1/2 rounded-full bg-accent/5 blur-[140px]" />
    <div className="relative mx-auto w-full max-w-[1120px] px-6 py-6">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="mx-auto mt-10 max-w-2xl text-center">
        {eyebrow && (
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-raised/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[1px] text-muted">
            <span className="size-1.5 rounded-full bg-low" />
            {eyebrow}
          </span>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      </div>
      <div className="mt-10">{children}</div>
      {footer && <div className="mt-10">{footer}</div>}
    </div>
  </div>
);

interface IHubCardProps {
  to: string;
  title: string;
  description: string;
  visual?: React.ReactNode;
  tags?: string[];
  badge?: React.ReactNode;
  cta?: string;
  centered?: boolean;
  className?: string;
}

export const HubCard: React.FC<IHubCardProps> = ({
  to,
  title,
  description,
  visual,
  tags,
  badge,
  cta,
  centered = true,
  className,
}) => (
  <Link
    to={to}
    className={cn(
      'group relative flex flex-col rounded-md border border-line-strong/70 bg-raised/70 p-6 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-raised',
      centered && 'items-center text-center',
      className,
    )}
  >
    {badge && <div className="absolute right-4 top-4">{badge}</div>}
    {visual && (
      <div
        className={cn('mb-6 flex min-h-[120px] w-full items-center', centered && 'justify-center')}
      >
        {visual}
      </div>
    )}
    <h2 className="text-lg font-semibold text-ink">{title}</h2>
    <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
    <div
      className={cn(
        'mt-6 flex w-full flex-wrap items-center gap-2',
        centered ? 'justify-center' : 'justify-between',
      )}
    >
      {tags && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}
      {cta && (
        <span className="inline-flex items-center gap-1.5 text-sm text-accent">
          {cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      )}
    </div>
  </Link>
);

// Little terminal/window preview used on "Events" hub cards
export const WindowPreview: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'w-full max-w-[220px] overflow-hidden rounded border border-line-strong bg-canvas text-left',
      className,
    )}
  >
    <div className="flex items-center gap-1.5 border-b border-line-strong px-2.5 py-1.5">
      <span className="size-2 rounded-full bg-critical/70" />
      <span className="size-2 rounded-full bg-medium/70" />
      <span className="size-2 rounded-full bg-low/70" />
    </div>
    <div className="space-y-1.5 p-2.5">
      {children ?? (
        <>
          <div className="h-1.5 w-11/12 rounded bg-line-strong" />
          <div className="h-1.5 w-2/3 rounded bg-line-strong" />
          <div className="h-1.5 w-4/5 rounded bg-accent/40" />
          <div className="h-1.5 w-1/2 rounded bg-line-strong" />
        </>
      )}
    </div>
  </div>
);
