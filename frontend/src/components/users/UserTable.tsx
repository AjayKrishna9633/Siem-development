import React from 'react';
import { Ban, Mail, Pencil, Send, UserCheck } from 'lucide-react';
import { StatusDot, Tag } from '../ui/Badge.tsx';
import { Avatar } from '../ui/Misc.tsx';
import { Table, THead, Th, Tr, Td } from '../ui/Table.tsx';
import { TableStatusRow } from '../common/TableStatusRow.tsx';
import { LocalTime } from '../common/LocalTime.tsx';
import type { IUser, UserStatus } from '../../types/auth.ts';
import { roleLabel } from '../../lib/roles.ts';
import { cn } from '../../lib/cn.ts';

const statusTone: Record<UserStatus, 'success' | 'info' | 'neutral'> = {
  active: 'success',
  invited: 'info',
  disabled: 'neutral',
};

const statusLabel: Record<UserStatus, string> = {
  active: 'Active',
  invited: 'Awaiting activation',
  disabled: 'Disabled',
};

interface IUserTableProps {
  users: IUser[];
  loading: boolean;
  emptyText: string;
  currentUserId?: string;
  busyId?: string | null;
  onResendActivation?: (user: IUser) => void;
  onChangeRole?: (user: IUser) => void;
  onSetEnabled?: (user: IUser, enabled: boolean) => void;
}

const COLUMNS = 5;

export const UserTable: React.FC<IUserTableProps> = ({
  users,
  loading,
  emptyText,
  currentUserId,
  busyId,
  onResendActivation,
  onChangeRole,
  onSetEnabled,
}) => (
  <Table>
    <THead>
      <tr>
        <Th>User</Th>
        <Th>Role</Th>
        <Th>Status</Th>
        <Th>Last login</Th>
        <Th className="text-right">Actions</Th>
      </tr>
    </THead>
    <tbody>
      {loading && (
        <TableStatusRow colSpan={COLUMNS} mono>
          Loading users…
        </TableStatusRow>
      )}
      {!loading && users.length === 0 && (
        <TableStatusRow colSpan={COLUMNS}>{emptyText}</TableStatusRow>
      )}
      {!loading &&
        users.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            isSelf={u.id === currentUserId}
            busy={busyId === u.id}
            onResendActivation={onResendActivation}
            onChangeRole={onChangeRole}
            onSetEnabled={onSetEnabled}
          />
        ))}
    </tbody>
  </Table>
);

const UserRow: React.FC<{
  user: IUser;
  isSelf: boolean;
  busy: boolean;
  onResendActivation?: (user: IUser) => void;
  onChangeRole?: (user: IUser) => void;
  onSetEnabled?: (user: IUser, enabled: boolean) => void;
}> = ({ user: u, isSelf, busy, onResendActivation, onChangeRole, onSetEnabled }) => {
  const status = u.status ?? 'active';
  const invited = status === 'invited';
  const disabled = status === 'disabled';
  // Only someone who hasn't activated yet can get a new activation
  const canResend = invited && !!onResendActivation;
  // The backend refuses changes to your own access; the buttons say so up front
  const selfNote = "You can't change your own access";

  return (
    <Tr className={cn(disabled && 'opacity-60')}>
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
            <p className="text-ink">
              {u.username}
              {isSelf && <span className="ml-2 text-xs text-muted">(you)</span>}
            </p>
            <p className="text-xs text-muted">{u.email}</p>
          </div>
        </div>
      </Td>
      <Td>
        <Tag className="text-ink">{roleLabel[u.role]}</Tag>
      </Td>
      <Td>
        <StatusDot tone={statusTone[status]} className={disabled ? 'text-muted' : 'text-ink'}>
          {statusLabel[status]}
        </StatusDot>
      </Td>
      <Td className="font-mono text-sm text-muted">
        <LocalTime value={u.lastLoginAt} empty="Never" />
      </Td>
      <Td>
        <div className="flex justify-end gap-3 text-muted">
          {canResend && (
            <button
              type="button"
              title="Send a new activation"
              disabled={busy}
              onClick={() => onResendActivation?.(u)}
              className="hover:text-ink disabled:opacity-50"
            >
              <Send className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            title={isSelf ? selfNote : 'Change role'}
            disabled={busy || isSelf || !onChangeRole}
            onClick={() => onChangeRole?.(u)}
            className="hover:text-ink disabled:opacity-40"
          >
            <Pencil className="size-3.5" />
          </button>
          {disabled ? (
            <button
              type="button"
              title="Enable user"
              disabled={busy || !onSetEnabled}
              onClick={() => onSetEnabled?.(u, true)}
              className="hover:text-ink disabled:opacity-40"
            >
              <UserCheck className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              title={isSelf ? selfNote : 'Disable user'}
              disabled={busy || isSelf || !onSetEnabled}
              onClick={() => onSetEnabled?.(u, false)}
              className="hover:text-critical disabled:opacity-40"
            >
              <Ban className="size-3.5" />
            </button>
          )}
        </div>
      </Td>
    </Tr>
  );
};
