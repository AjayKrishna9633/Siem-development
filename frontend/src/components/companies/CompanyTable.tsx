import React from 'react';
import { Building2, Mail, Pencil, Power, Send } from 'lucide-react';
import { StatusDot } from '../ui/Badge.tsx';
import { Avatar } from '../ui/Misc.tsx';
import { Table, THead, Th, Tr, Td } from '../ui/Table.tsx';
import { TableStatusRow } from '../common/TableStatusRow.tsx';
import { LocalTime } from '../common/LocalTime.tsx';
import type { ICompany } from '../../types/company.ts';
import { cn } from '../../lib/cn.ts';

interface ICompanyActions {
  busyId: string | null;
  onEdit: (company: ICompany) => void;
  onResendActivation: (company: ICompany) => void;
  onToggleStatus: (company: ICompany) => void;
}

interface ICompanyTableProps extends ICompanyActions {
  companies: ICompany[];
  loading: boolean;
  emptyText: string;
}

const COLUMNS = 6;

export const CompanyTable: React.FC<ICompanyTableProps> = ({
  companies,
  loading,
  emptyText,
  ...actions
}) => (
  <Table>
    <THead>
      <tr>
        <Th>Company</Th>
        <Th>Admin</Th>
        <Th>Users</Th>
        <Th>Status</Th>
        <Th>Created</Th>
        <Th className="text-right">Actions</Th>
      </tr>
    </THead>
    <tbody>
      {loading && (
        <TableStatusRow colSpan={COLUMNS} mono>
          Loading companies…
        </TableStatusRow>
      )}
      {!loading && companies.length === 0 && (
        <TableStatusRow colSpan={COLUMNS}>{emptyText}</TableStatusRow>
      )}
      {!loading && companies.map((c) => <CompanyRow key={c.id} company={c} {...actions} />)}
    </tbody>
  </Table>
);

const CompanyRow: React.FC<ICompanyActions & { company: ICompany }> = ({
  company: c,
  busyId,
  onEdit,
  onResendActivation,
  onToggleStatus,
}) => {
  const deactivated = c.status === 'deactivated';
  const adminPending = c.admin?.status === 'invited';
  const busy = busyId === c.id;

  return (
    <Tr className={cn(deactivated && 'opacity-60')}>
      <Td>
        <div className="flex items-center gap-3">
          <span className="flex size-7 items-center justify-center rounded border border-line-strong bg-canvas text-muted">
            <Building2 className="size-3.5" />
          </span>
          <p className="text-ink">{c.name}</p>
        </div>
      </Td>
      <Td>
        {c.admin ? (
          <div className="flex items-center gap-3">
            {adminPending ? (
              <span className="flex size-7 items-center justify-center rounded-full border border-dashed border-line-strong text-muted">
                <Mail className="size-3.5" />
              </span>
            ) : (
              <Avatar name={c.admin.username} />
            )}
            <div>
              <p className="text-ink">{c.admin.username}</p>
              <p className="text-xs text-muted">
                {c.admin.email}
                {adminPending && ' · awaiting activation'}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-sm text-muted">No admin assigned</span>
        )}
      </Td>
      <Td className="font-mono text-sm text-muted">{c.userCount}</Td>
      <Td>
        <StatusDot
          tone={deactivated ? 'neutral' : 'success'}
          className={deactivated ? 'text-muted' : 'text-ink'}
        >
          {deactivated ? 'Deactivated' : 'Active'}
        </StatusDot>
      </Td>
      <Td className="font-mono text-sm text-muted">
        <LocalTime value={c.createdAt} format="date" />
      </Td>
      <Td>
        <div className="flex justify-end gap-3 text-muted">
          <button
            type="button"
            title="Edit company or change its admin"
            disabled={busy}
            onClick={() => onEdit(c)}
            className="hover:text-ink disabled:opacity-50"
          >
            <Pencil className="size-3.5" />
          </button>
          {adminPending && !deactivated && (
            <button
              type="button"
              title="Send the admin a new activation"
              disabled={busy}
              onClick={() => onResendActivation(c)}
              className="hover:text-ink disabled:opacity-50"
            >
              <Send className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            title={deactivated ? 'Reactivate company' : 'Deactivate company'}
            disabled={busy}
            onClick={() => onToggleStatus(c)}
            className={cn(
              'disabled:opacity-50',
              deactivated ? 'hover:text-success' : 'hover:text-critical',
            )}
          >
            <Power className="size-3.5" />
          </button>
        </div>
      </Td>
    </Tr>
  );
};
