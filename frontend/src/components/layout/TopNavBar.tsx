import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Settings,
  Sparkles,
  SquareTerminal,
  UserRound,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store.ts';
import { useUiStore } from '../../store/ui.store.ts';
import type { UserRole } from '../../types/auth.ts';
import { cn } from '../../lib/cn.ts';
import { roleLabel } from '../../lib/roles.ts';
import { Avatar } from '../ui/Misc.tsx';

const personas: { role: UserRole; title: string; caption: string }[] = [
  { role: 'super_admin', title: 'Super Admin', caption: 'Platform owner' },
  { role: 'org_admin', title: 'Organization Admin', caption: 'Acme Corp lead' },
  { role: 'analyst', title: 'Security Analyst', caption: 'SOC triage' },
];

export const TopNavBar: React.FC = () => {
  const { user, logout, loginAsDemoUser } = useAuthStore();
  const { sidebarExpanded, toggleSidebar } = useUiStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState<UserRole | null>(null);
  const [query, setQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitch = async (role: UserRole) => {
    try {
      setSwitching(role);
      await loginAsDemoUser(role);
      setMenuOpen(false);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/logs?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line-strong/60 bg-surface px-6">
      <div className="flex items-center gap-5">
        <Link to="/dashboard" className="flex items-center gap-2 text-accent">
          <SquareTerminal className="size-5" strokeWidth={1.75} />
          <span className="text-lg font-semibold tracking-tight">SIEMple</span>
        </Link>
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search queries, IPs..."
            className="h-7 w-52 rounded-sm border border-line-strong bg-canvas pl-8 pr-2 text-xs text-ink placeholder:text-subtle focus:border-accent/60 focus:outline-none"
          />
        </form>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/alerts" className="relative text-ink hover:text-accent" aria-label="Alerts">
          <Bell className="size-[18px]" strokeWidth={1.75} />
          <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-critical" />
        </Link>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          className="flex size-7 items-center justify-center rounded-sm border border-accent/50 bg-accent/10 text-accent hover:bg-accent/20"
        >
          {sidebarExpanded ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
        <span className="h-6 w-px bg-line-strong" />

        {user && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full ring-accent/40 hover:ring-2"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar
                name={user.username}
                className="size-8 border-accent/40 bg-accent/10 text-accent"
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded border border-line-strong bg-surface p-1.5 shadow-2xl"
              >
                <div className="border-b border-line px-2.5 pb-2.5 pt-1.5">
                  <p className="truncate text-sm font-medium text-ink">{user.username}</p>
                  <p className="truncate font-mono text-[11px] text-muted">{user.email}</p>
                  <span className="mt-2 inline-block rounded-sm border border-line-strong bg-canvas px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-muted">
                    {roleLabel[user.role]}
                  </span>
                </div>
                <MenuLink
                  to="/profile"
                  icon={<UserRound className="size-4" />}
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </MenuLink>
                <MenuLink
                  to="/settings"
                  icon={<Settings className="size-4" />}
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </MenuLink>

                <div className="mt-1 border-t border-line pt-1">
                  <p className="flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.5px] text-subtle">
                    <Sparkles className="size-3 text-medium" /> Demo persona
                  </p>
                  {personas.map((p) => (
                    <button
                      key={p.role}
                      type="button"
                      disabled={switching !== null}
                      onClick={() => handleSwitch(p.role)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left text-xs hover:bg-raised disabled:opacity-60',
                        user.role === p.role ? 'text-accent' : 'text-ink',
                      )}
                    >
                      <span>
                        {p.title}
                        <span className="ml-1.5 text-subtle">{p.caption}</span>
                      </span>
                      {switching === p.role && (
                        <span className="font-mono text-[10px] text-muted">…</span>
                      )}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-2 border-t border-line px-2.5 pb-1.5 pt-2.5 text-left text-sm text-muted hover:text-critical"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

const MenuLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ to, icon, onClick, children }) => (
  <Link
    to={to}
    onClick={onClick}
    role="menuitem"
    className="mt-1 flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-ink hover:bg-raised"
  >
    <span className="text-muted">{icon}</span>
    {children}
  </Link>
);
