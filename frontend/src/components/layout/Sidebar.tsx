import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router';
import { FileSearch, ShieldCheck, Settings, CircleHelp } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store.ts';
import { useUiStore } from '../../store/ui.store.ts';
import { cn } from '../../lib/cn.ts';
import { SvgIcon } from '../ui/Misc.tsx';
import logoShield from '../../assets/icons/logo-shield.svg';
import { navGroups, type INavItem } from './nav.ts';

const NavIcon: React.FC<{ icon: INavItem['icon'] }> = ({ icon }) => {
  if (icon === 'fim') return <FileSearch className="size-[17px]" strokeWidth={1.75} />;
  if (icon === 'compliance') return <ShieldCheck className="size-[17px]" strokeWidth={1.75} />;
  return <SvgIcon src={icon.src} width={icon.width} height={icon.height} />;
};

// Nested routes like /mitre/intelligence must not also light up /mitre
const isItemActive = (pathname: string, to: string, allTargets: string[]) => {
  if (pathname === to) return true;
  if (!pathname.startsWith(`${to}/`)) return false;
  return !allTargets.some(
    (other) => other !== to && other.startsWith(`${to}/`) && pathname.startsWith(other),
  );
};

interface IRailLinkProps {
  to: string;
  label: string;
  expanded: boolean;
  active: boolean;
  children: React.ReactNode;
}

const RailLink: React.FC<IRailLinkProps> = ({ to, label, expanded, active, children }) => {
  // Fixed-position hover label so the scrollable rail doesn't clip it
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  const showTip = (e: React.SyntheticEvent<HTMLElement>) => {
    if (expanded) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTip({ top: rect.top + rect.height / 2, left: rect.right + 10 });
  };

  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onMouseEnter={showTip}
      onFocus={showTip}
      onMouseLeave={() => setTip(null)}
      onBlur={() => setTip(null)}
      className={cn(
        'relative flex h-10 items-center gap-3 rounded-r border-l-2 pl-[14px] pr-2.5 transition-colors',
        expanded ? 'justify-start' : 'justify-center',
        active
          ? 'border-accent bg-canvas/60 text-accent'
          : 'border-transparent text-muted hover:bg-canvas/40 hover:text-ink',
      )}
    >
      <span className="flex w-5 shrink-0 justify-center">{children}</span>
      {expanded && <span className="truncate text-sm">{label}</span>}
      {tip && !expanded && (
        <span
          className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded border border-line-strong bg-canvas px-2 py-1 text-xs text-ink shadow-lg"
          style={{ top: tip.top, left: tip.left }}
        >
          {label}
        </span>
      )}
    </Link>
  );
};

export const Sidebar: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const expanded = useUiStore((s) => s.sidebarExpanded);
  const { pathname } = useLocation();

  const groups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.roles || (user && i.roles.includes(user.role))),
    }))
    .filter((g) => g.items.length > 0);
  const allTargets = groups.flatMap((g) => g.items.map((i) => i.to));

  return (
    <aside
      className={cn(
        'sticky top-16 flex h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-line bg-raised transition-[width] duration-200',
        expanded ? 'w-56' : 'w-16',
      )}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-line-strong px-4">
        <NavLink
          to="/dashboard"
          className="flex size-8 items-center justify-center rounded-sm border border-accent/50 bg-accent/20 text-accent"
          aria-label="SIEMple home"
        >
          <SvgIcon src={logoShield} width={13.3} height={16.7} />
        </NavLink>
        {expanded && (
          <span className="ml-3 font-mono text-[10px] uppercase tracking-[1px] text-muted">
            SOC Console
          </span>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4">
        {groups.map((group, gi) => (
          <div key={group.id} className="px-2 pb-2">
            {gi > 0 &&
              (expanded ? (
                <p className="px-3.5 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[1px] text-subtle">
                  {group.label}
                </p>
              ) : (
                <div className="flex justify-center py-1">
                  <span className="h-px w-4 bg-line-strong" />
                </div>
              ))}
            <div className="space-y-1">
              {group.items.map((item) => (
                <RailLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  expanded={expanded}
                  active={isItemActive(pathname, item.to, allTargets)}
                >
                  <NavIcon icon={item.icon} />
                </RailLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-line-strong px-2 py-3">
        <RailLink
          to="/settings"
          label="Settings"
          expanded={expanded}
          active={pathname.startsWith('/settings') && !pathname.startsWith('/settings/users')}
        >
          <Settings className="size-[17px]" strokeWidth={1.75} />
        </RailLink>
        <RailLink to="/help" label="Help & docs" expanded={expanded} active={pathname === '/help'}>
          <CircleHelp className="size-[17px]" strokeWidth={1.75} />
        </RailLink>
      </div>
    </aside>
  );
};
