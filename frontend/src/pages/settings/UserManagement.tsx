import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { UserPlus } from 'lucide-react';
import { Page, PageHeader } from '../../components/ui/PageHeader.tsx';
import { Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { StatTiles } from '../../components/common/StatTiles.tsx';
import { FilterSelect, ListToolbar } from '../../components/common/ListToolbar.tsx';
import { UserTable } from '../../components/users/UserTable.tsx';
import { useRemoteList } from '../../hooks/useRemoteList.ts';
import { usePaged } from '../../hooks/usePaged.ts';
import { useAuthStore } from '../../store/auth.store.ts';
import { usersService } from '../../services/users.service.ts';
import { SortControl } from '../../components/common/SortControl.tsx';
import {
  ResendInviteDialog,
  ResentInviteNotice,
  RevokeInviteDialog,
} from '../../components/users/InviteDialogs.tsx';
import { ChangeRoleDialog } from '../../components/users/ChangeRoleDialog.tsx';
import { UserStatusDialog } from '../../components/users/UserStatusDialog.tsx';
import type { IInviteDelivery, IManagedUser, UserRole, UserStatus } from '../../types/auth.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { sortItems, type ISortField, type SortDirection } from '../../lib/sort.ts';
import { ALL_ROLES, roleLabel } from '../../lib/roles.ts';

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'disabled', label: 'Disabled' },
];

const ROLE_OPTIONS = ALL_ROLES.map((r) => ({ value: r, label: roleLabel[r] }));

type UserSortKey = 'name' | 'email' | 'role' | 'status' | 'lastLogin';

const SORT_FIELDS: ISortField<IManagedUser, UserSortKey>[] = [
  { value: 'name', label: 'Name', kind: 'text', get: (u) => u.username ?? u.email },
  { value: 'email', label: 'Email', kind: 'text', get: (u) => u.email },
  {
    value: 'role',
    label: 'Role',
    kind: 'text',
    get: (u) => roleLabel[u.role],
  },
  {
    value: 'status',
    label: 'Status',
    kind: 'text',
    get: (u) => STATUS_OPTIONS.find((s) => s.value === (u.status ?? 'active'))?.label,
  },
  { value: 'lastLogin', label: 'Last login', kind: 'date', get: (u) => u.lastLoginAt },
];

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const {
    items: users,
    setItems: setUsers,
    loading,
    error,
    reload,
  } = useRemoteList(usersService.list, 'Failed to load users.');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resent, setResent] = useState<{ user: IManagedUser; delivery: IInviteDelivery } | null>(
    null,
  );

  // Resending and revoking are confirmed first: both kill the link the person may be using
  const [confirmResend, setConfirmResend] = useState<IManagedUser | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<IManagedUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<IManagedUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    user: IManagedUser;
    enable: boolean;
  } | null>(null);

  // The server answers with the updated row; swap it in without reloading the list
  const replaceUser = (updated: IManagedUser) =>
    setUsers((current) => current.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));

  const runAction = async (
    u: IManagedUser,
    action: () => Promise<IManagedUser>,
    failure: string,
  ) => {
    setBusyId(u.id);
    setActionError(null);
    try {
      replaceUser(await action());
    } catch (err: unknown) {
      setActionError(apiErrorMessage(err, failure));
    } finally {
      setBusyId(null);
    }
  };

  const resendInvite = async (u: IManagedUser) => {
    setBusyId(u.id);
    setActionError(null);
    try {
      const delivery = await usersService.resendInvite(u.id);
      setResent({ user: u, delivery });
      replaceUser({ ...u, inviteExpired: false });
    } catch (err: unknown) {
      setActionError(apiErrorMessage(err, 'Failed to send a new invitation.'));
    } finally {
      setBusyId(null);
    }
  };

  const revokeInvite = async (u: IManagedUser) => {
    setBusyId(u.id);
    setActionError(null);
    try {
      await usersService.revokeInvite(u.id);
      setUsers((current) => current.filter((x) => x.id !== u.id));
    } catch (err: unknown) {
      setActionError(apiErrorMessage(err, 'Failed to revoke the invitation.'));
    } finally {
      setBusyId(null);
    }
  };
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | UserRole>('all');
  const [status, setStatus] = useState<'all' | UserStatus>('all');
  const [sortBy, setSortBy] = useState<UserSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (role === 'all' || u.role === role) &&
        (status === 'all' || (u.status ?? 'active') === status) &&
        `${u.username ?? ''} ${u.email}`.toLowerCase().includes(q),
    );
  }, [users, role, status, search]);

  const sorted = useMemo(
    () =>
      sortItems(
        filtered,
        SORT_FIELDS.find((f) => f.value === sortBy) ?? SORT_FIELDS[0],
        sortDirection,
      ),
    [filtered, sortBy, sortDirection],
  );

  const { visible, paging } = usePaged(sorted);
  const count = (s: UserStatus) => users.filter((u) => (u.status ?? 'active') === s).length;
  const filtersActive = search !== '' || role !== 'all' || status !== 'all';

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'User Management' }]}
        title="User Management"
        description="Everyone who can sign in to this SIEMple install."
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

      <StatTiles
        loading={loading}
        stats={[
          { label: 'Total users', value: users.length },
          { label: 'Pending invitations', value: count('invited') },
          { label: 'Disabled accounts', value: count('disabled') },
        ]}
      />

      {resent && (
        <ResentInviteNotice
          email={resent.user.email}
          delivery={resent.delivery}
          onDismiss={() => setResent(null)}
        />
      )}

      {actionError && <p className="text-sm text-critical">{actionError}</p>}

      <Panel className="bg-raised/30">
        <ListToolbar
          search={search}
          onSearch={setSearch}
          placeholder="FILTER BY NAME OR EMAIL..."
          loading={loading}
          onRefresh={reload}
          paging={paging}
        >
          <FilterSelect
            label="Role"
            allLabel="All Roles"
            value={role}
            options={ROLE_OPTIONS}
            onChange={(v) => {
              setRole(v);
              paging.setPage(1);
            }}
          />
          <FilterSelect
            label="Status"
            allLabel="All Status"
            value={status}
            options={STATUS_OPTIONS}
            className="w-44"
            onChange={(v) => {
              setStatus(v);
              paging.setPage(1);
            }}
          />
          <span className="h-6 w-px bg-line-strong" />
          <SortControl
            fields={SORT_FIELDS}
            field={sortBy}
            direction={sortDirection}
            onFieldChange={(f) => {
              setSortBy(f);
              paging.setPage(1);
            }}
            onDirectionChange={(d) => {
              setSortDirection(d);
              paging.setPage(1);
            }}
          />
        </ListToolbar>

        {error ? (
          <div className="px-4 py-12 text-center text-sm text-critical">{error}</div>
        ) : (
          <UserTable
            users={visible}
            loading={loading}
            currentUserId={currentUserId}
            busyId={busyId}
            onResendInvite={setConfirmResend}
            onRevokeInvite={setConfirmRevoke}
            onChangeRole={setRoleTarget}
            onSetEnabled={(user, enable) => setStatusTarget({ user, enable })}
            emptyText={
              filtersActive
                ? 'No users match the current filters.'
                : 'No users yet. Invite an analyst to get started.'
            }
          />
        )}
      </Panel>

      {confirmResend && (
        <ResendInviteDialog
          email={confirmResend.email}
          onConfirm={async () => {
            await resendInvite(confirmResend);
            setConfirmResend(null);
          }}
          onCancel={() => setConfirmResend(null)}
        />
      )}

      {confirmRevoke && (
        <RevokeInviteDialog
          email={confirmRevoke.email}
          onConfirm={async () => {
            await revokeInvite(confirmRevoke);
            setConfirmRevoke(null);
          }}
          onCancel={() => setConfirmRevoke(null)}
        />
      )}

      {roleTarget && (
        <ChangeRoleDialog
          user={roleTarget}
          onSave={async (role) => {
            await runAction(
              roleTarget,
              () => usersService.changeRole(roleTarget.id, role),
              'Failed to change the role.',
            );
            setRoleTarget(null);
          }}
          onCancel={() => setRoleTarget(null)}
        />
      )}

      {statusTarget && (
        <UserStatusDialog
          user={statusTarget.user}
          enable={statusTarget.enable}
          onConfirm={async () => {
            const { user, enable } = statusTarget;
            await runAction(
              user,
              () => usersService.setEnabled(user.id, enable),
              enable ? 'Failed to enable the user.' : 'Failed to disable the user.',
            );
            setStatusTarget(null);
          }}
          onCancel={() => setStatusTarget(null)}
        />
      )}
    </Page>
  );
};
