import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Page, PageHeader } from '@/components/ui/PageHeader.tsx';
import { Panel } from '@/components/ui/Panel.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { StatTiles } from '@/components/common/StatTiles.tsx';
import { FilterSelect, ListToolbar, type IPaging } from '@/components/common/ListToolbar.tsx';
import { UserTable } from '@/components/users/UserTable.tsx';
import { useRemote } from '@/hooks/useRemote.ts';
import { useDebounced } from '@/hooks/useDebounced.ts';
import { useAuthStore, ALL_ROLES, roleLabel } from '@/features/auth';
import { usersService } from '@/services/users.service.ts';
import { SortControl } from '@/components/common/SortControl.tsx';
import {
  IssueResetLinkDialog,
  LinkIssuedNotice,
  ResendInviteDialog,
  RevokeInviteDialog,
} from '@/components/users/InviteDialogs.tsx';
import { ChangeRoleDialog } from '@/components/users/ChangeRoleDialog.tsx';
import { UserStatusDialog } from '@/components/users/UserStatusDialog.tsx';
import type { ILinkDelivery, IManagedUser, UserSortKey } from '@/types/auth.ts';
import type { UserRole, UserStatus } from '@/features/auth';
import { apiErrorMessage } from '@/lib/errors.ts';
import type { ISortField, SortDirection } from '@/lib/sort.ts';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'disabled', label: 'Disabled' },
];

const ROLE_OPTIONS = ALL_ROLES.map((r) => ({ value: r, label: roleLabel[r] }));

const SORT_FIELDS: ISortField<UserSortKey>[] = [
  { value: 'name', label: 'Name', kind: 'text' },
  { value: 'email', label: 'Email', kind: 'text' },
  { value: 'role', label: 'Role', kind: 'text' },
  { value: 'status', label: 'Status', kind: 'text' },
  { value: 'lastLogin', label: 'Last login', kind: 'date' },
];

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | UserRole>('all');
  const [status, setStatus] = useState<'all' | UserStatus>('all');
  const [sortBy, setSortBy] = useState<UserSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const debouncedSearch = useDebounced(search.trim());

  const fetchPage = useCallback(
    () =>
      usersService.list({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: role === 'all' ? undefined : role,
        status: status === 'all' ? undefined : status,
        sortBy,
        sortDir: sortDirection,
      }),
    [page, debouncedSearch, role, status, sortBy, sortDirection],
  );
  const { data, loading, error, reload } = useRemote(fetchPage, 'Failed to load users.');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [issued, setIssued] = useState<{
    user: IManagedUser;
    delivery: ILinkDelivery;
    kind: 'invite' | 'reset';
  } | null>(null);

  const [confirmResend, setConfirmResend] = useState<IManagedUser | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<IManagedUser | null>(null);
  const [confirmReset, setConfirmReset] = useState<IManagedUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<IManagedUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    user: IManagedUser;
    enable: boolean;
  } | null>(null);

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const counts = data?.counts ?? { all: 0, invited: 0, disabled: 0 };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstLoad = loading && !data;

  if (data && page > pages) setPage(pages);

  const paging: IPaging = {
    page,
    pages,
    from: total ? (page - 1) * PAGE_SIZE + 1 : 0,
    to: Math.min(page * PAGE_SIZE, total),
    total,
    setPage,
  };

  const runAction = async (
    u: IManagedUser,
    action: () => Promise<unknown>,
    failure: string,
    success?: string,
  ) => {
    setBusyId(u.id);
    try {
      await action();
      if (success) toast.success(success);
      reload();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, failure));
    } finally {
      setBusyId(null);
    }
  };

  const resendInvite = (u: IManagedUser) =>
    runAction(
      u,
      async () => {
        const delivery = await usersService.resendInvite(u.id);
        setIssued({ user: u, delivery, kind: 'invite' });
      },
      'Failed to send a new invitation.',
    );

  const issueResetLink = (u: IManagedUser) =>
    runAction(
      u,
      async () => {
        const delivery = await usersService.issueResetLink(u.id);
        setIssued({ user: u, delivery, kind: 'reset' });
      },
      'Failed to issue a reset link.',
    );

  const revokeInvite = (u: IManagedUser) =>
    runAction(
      u,
      () => usersService.revokeInvite(u.id),
      'Failed to revoke the invitation.',
      `Invitation for ${u.email} revoked.`,
    );

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
        loading={firstLoad}
        stats={[
          { label: 'Total users', value: counts.all },
          { label: 'Pending invitations', value: counts.invited },
          { label: 'Disabled accounts', value: counts.disabled },
        ]}
      />

      {issued && (
        <LinkIssuedNotice
          email={issued.user.email}
          delivery={issued.delivery}
          kind={issued.kind}
          onDismiss={() => setIssued(null)}
        />
      )}

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
            users={users}
            loading={firstLoad}
            currentUserId={currentUserId}
            busyId={busyId}
            onResendInvite={setConfirmResend}
            onRevokeInvite={setConfirmRevoke}
            onIssueResetLink={setConfirmReset}
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

      {confirmReset && (
        <IssueResetLinkDialog
          email={confirmReset.email}
          onConfirm={async () => {
            await issueResetLink(confirmReset);
            setConfirmReset(null);
          }}
          onCancel={() => setConfirmReset(null)}
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
              `${roleTarget.email} is now ${roleLabel[role]}.`,
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
              `${user.email} ${enable ? 'enabled' : 'disabled'}.`,
            );
            setStatusTarget(null);
          }}
          onCancel={() => setStatusTarget(null)}
        />
      )}
    </Page>
  );
};
