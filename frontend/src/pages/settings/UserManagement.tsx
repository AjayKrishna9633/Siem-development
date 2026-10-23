import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Mail,
  Monitor,
  Pencil,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { Page, PageHeader } from '../../components/ui/PageHeader.tsx';
import { MonoLabel, Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { SearchInput, Select } from '../../components/ui/Form.tsx';
import { StatusDot, Tag } from '../../components/ui/Badge.tsx';
import { Avatar } from '../../components/ui/Misc.tsx';
import { Table, THead, Th, Tr, Td } from '../../components/ui/Table.tsx';
import { authService } from '../../services/auth.service.ts';
import type { IUser, UserRole, UserStatus } from '../../types/auth.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { cn } from '../../lib/cn.ts';

const roleTag: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Administrator',
  analyst: 'Analyst',
};

const statusTone: Record<UserStatus, 'success' | 'info' | 'neutral'> = {
  active: 'success',
  invited: 'info',
  disabled: 'neutral',
};

const PAGE_SIZE = 10;

const formatLogin = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${d.toISOString().slice(0, 16).replace('T', ' ')}Z`;
};

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | UserRole>('all');
  const [status, setStatus] = useState<'all' | UserStatus>('all');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    authService
      .listUsers()
      .then((data) => {
        if (!active) return;
        setUsers(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(apiErrorMessage(err, 'Failed to load users.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const load = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (role === 'all' || u.role === role) &&
          (status === 'all' || (u.status ?? 'active') === status) &&
          `${u.username} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [users, role, status, search],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const count = (s: UserStatus) => users.filter((u) => (u.status ?? 'active') === s).length;

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'User Management' }]}
        title="User Management"
        actions={
          <Button
            variant="primary"
            icon={<UserPlus className="size-4" />}
            onClick={() => navigate('/users/new')}
          >
            Invite user
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total users', value: users.length },
          { label: 'Pending invites', value: count('invited') },
          { label: 'Disabled accounts', value: count('disabled') },
        ].map((k) => (
          <Panel key={k.label} className="bg-raised/50 p-4">
            <MonoLabel>{k.label}</MonoLabel>
            <p className="mt-2 text-2xl text-ink">{loading ? '—' : k.value}</p>
          </Panel>
        ))}
      </div>

      <Panel className="bg-raised/30">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <SearchInput
            mono
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="FILTER BY NAME OR EMAIL..."
            className="w-64 [&_input]:h-8 [&_input]:uppercase"
          />
          <span className="h-6 w-px bg-line-strong" />
          <label className="flex items-center gap-2">
            <MonoLabel>Role:</MonoLabel>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as 'all' | UserRole)}
              className="w-36 [&_select]:h-8 [&_select]:text-xs"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="org_admin">Administrator</option>
              <option value="analyst">Analyst</option>
            </Select>
          </label>
          <label className="flex items-center gap-2">
            <MonoLabel>Status:</MonoLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'all' | UserStatus)}
              className="w-32 [&_select]:h-8 [&_select]:text-xs"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="disabled">Disabled</option>
            </Select>
          </label>
          <div className="ml-auto flex items-center gap-2 font-mono text-[11px] text-muted">
            <button
              type="button"
              onClick={load}
              className="mr-2 hover:text-ink"
              aria-label="Refresh"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            </button>
            {filtered.length
              ? `${(current - 1) * PAGE_SIZE + 1}-${Math.min(current * PAGE_SIZE, filtered.length)}`
              : '0'}{' '}
            of {filtered.length}
            <button
              type="button"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="hover:text-ink disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
              className="hover:text-ink disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-4 py-12 text-center text-sm text-critical">{error}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Source</Th>
                <Th>Status</Th>
                <Th>Last login</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </THead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-mono text-xs text-muted">
                    Loading users…
                  </td>
                </tr>
              )}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                    No users match the current filters.
                  </td>
                </tr>
              )}
              {!loading &&
                visible.map((u) => {
                  const st = u.status ?? 'active';
                  const invited = st === 'invited';
                  const disabled = st === 'disabled';
                  return (
                    <Tr key={u.id} className={cn(disabled && 'opacity-60')}>
                      <Td>
                        <div className="flex items-center gap-3">
                          {invited ? (
                            <span className="flex size-7 items-center justify-center rounded-full border border-dashed border-line-strong text-muted">
                              <Mail className="size-3.5" />
                            </span>
                          ) : (
                            <Avatar name={u.username} />
                          )}
                          <div>
                            <p className="text-ink">{invited ? u.email : u.username}</p>
                            <p className="text-xs text-muted">
                              {invited ? 'Awaiting first login' : u.email}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Tag className="text-ink">{roleTag[u.role]}</Tag>
                      </Td>
                      <Td>
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          {u.role === 'super_admin' ? (
                            <Monitor className="size-3.5" />
                          ) : (
                            <Cloud className="size-3.5" />
                          )}
                          {u.role === 'super_admin' ? 'Local' : 'Invite'}
                        </span>
                      </Td>
                      <Td>
                        <StatusDot
                          tone={statusTone[st]}
                          className={disabled ? 'text-muted' : 'text-ink'}
                        >
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </StatusDot>
                      </Td>
                      <Td className="font-mono text-sm text-muted">{formatLogin(u.lastLoginAt)}</Td>
                      <Td>
                        <div className="flex justify-end gap-3 text-muted">
                          <button
                            type="button"
                            title="Editing other users isn't available yet"
                            disabled
                            className="disabled:opacity-50"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Disabling users isn't available yet"
                            disabled
                            className="disabled:opacity-50"
                          >
                            <Ban className="size-3.5" />
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
            </tbody>
          </Table>
        )}
      </Panel>
    </Page>
  );
};
