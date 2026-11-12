import React from 'react';
import { Link, NavLink } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn.ts';

export interface ICrumb {
  label: string;
  to?: string;
}

export const Breadcrumbs: React.FC<{ items: ICrumb[]; className?: string }> = ({
  items,
  className,
}) => (
  <nav
    aria-label="Breadcrumb"
    className={cn(
      'flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.5px]',
      className,
    )}
  >
    {items.map((item, i) => {
      const last = i === items.length - 1;
      return (
        <React.Fragment key={item.label}>
          {item.to && !last ? (
            <Link to={item.to} className="text-muted transition-colors hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span className={last ? 'text-ink' : 'text-muted'}>{item.label}</span>
          )}
          {!last && <ChevronRight className="size-3 text-subtle" />}
        </React.Fragment>
      );
    })}
  </nav>
);

interface IPageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  crumbs?: ICrumb[];
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<IPageHeaderProps> = ({
  title,
  description,
  crumbs,
  actions,
  icon,
  className,
}) => (
  <div className={cn('space-y-3', className)}>
    {crumbs && <Breadcrumbs items={crumbs} />}
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded border border-line-strong bg-raised text-ink">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </div>
);

export interface ITab {
  label: string;
  to: string;
}

export const ModuleTabs: React.FC<{ tabs: ITab[]; className?: string }> = ({ tabs, className }) => (
  <nav className={cn('flex gap-6 border-b border-line', className)}>
    {tabs.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        end
        className={({ isActive }) =>
          cn(
            '-mb-px border-b-2 pb-2.5 text-sm transition-colors',
            isActive ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink',
          )
        }
      >
        {tab.label}
      </NavLink>
    ))}
  </nav>
);

export const ViewToggle: React.FC<{ tabs: ITab[] }> = ({ tabs }) => (
  <nav className="inline-flex rounded border border-line-strong bg-canvas p-0.5">
    {tabs.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        end
        className={({ isActive }) =>
          cn(
            'rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.5px] transition-colors',
            isActive ? 'bg-raised text-ink' : 'text-muted hover:text-ink',
          )
        }
      >
        {tab.label}
      </NavLink>
    ))}
  </nav>
);

export const Page: React.FC<{ children: React.ReactNode; className?: string; wide?: boolean }> = ({
  children,
  className,
  wide,
}) => (
  <div
    className={cn(
      'mx-auto w-full space-y-6 px-6 py-6',
      wide ? 'max-w-none' : 'max-w-[1440px]',
      className,
    )}
  >
    {children}
  </div>
);
