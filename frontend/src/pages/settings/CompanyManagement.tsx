import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Building2 } from 'lucide-react';
import { Page, PageHeader } from '../../components/ui/PageHeader.tsx';
import { Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { ResendActivationDialog } from '../../components/common/ResendActivationDialog.tsx';
import { StatTiles } from '../../components/common/StatTiles.tsx';
import { FilterSelect, ListToolbar } from '../../components/common/ListToolbar.tsx';
import { ResentActivationNotice } from '../../components/common/ResentActivationNotice.tsx';
import { CompanyTable } from '../../components/companies/CompanyTable.tsx';
import { EditCompanyModal } from '../../components/companies/EditCompanyModal.tsx';
import { useRemoteList } from '../../hooks/useRemoteList.ts';
import { usePaged } from '../../hooks/usePaged.ts';
import { companyService } from '../../services/company.service.ts';
import type { CompanyStatus, IActivationGrant, ICompany } from '../../types/company.ts';
import { SortControl } from '../../components/common/SortControl.tsx';
import { apiErrorMessage } from '../../lib/errors.ts';
import { sortItems, type ISortField, type SortDirection } from '../../lib/sort.ts';

const STATUS_OPTIONS: { value: CompanyStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'deactivated', label: 'Deactivated' },
];

type CompanySortKey = 'name' | 'admin' | 'users' | 'status' | 'created';

const SORT_FIELDS: ISortField<ICompany, CompanySortKey>[] = [
  { value: 'name', label: 'Company', kind: 'text', get: (c) => c.name },
  { value: 'admin', label: 'Admin', kind: 'text', get: (c) => c.admin?.username },
  { value: 'users', label: 'Users', kind: 'number', get: (c) => c.userCount },
  {
    value: 'status',
    label: 'Status',
    kind: 'text',
    get: (c) => (c.status === 'active' ? 'Active' : 'Deactivated'),
  },
  { value: 'created', label: 'Created', kind: 'date', get: (c) => c.createdAt },
];

export const CompanyManagement: React.FC = () => {
  const navigate = useNavigate();
  const {
    items: companies,
    setItems: setCompanies,
    loading,
    error,
    reload,
  } = useRemoteList(companyService.list, 'Failed to load companies.');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | CompanyStatus>('all');
  const [sortBy, setSortBy] = useState<CompanySortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resent, setResent] = useState<{ company: ICompany; grant: IActivationGrant } | null>(null);
  // Tracked by ID so the dialog always shows the latest copy after a rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = companies.find((c) => c.id === editingId) ?? null;

  const replaceInList = (updated: ICompany) =>
    setCompanies((list) => list.map((x) => (x.id === updated.id ? updated : x)));

  // Deactivating locks everyone out, so it waits for the confirmation dialog
  const [deactivating, setDeactivating] = useState<ICompany | null>(null);

  const requestToggle = (c: ICompany) => {
    if (c.status === 'active') setDeactivating(c);
    else void changeStatus(c, false);
  };

  const changeStatus = async (c: ICompany, deactivate: boolean) => {
    setBusyId(c.id);
    setActionError(null);
    try {
      replaceInList(
        deactivate ? await companyService.deactivate(c.id) : await companyService.reactivate(c.id),
      );
    } catch (err: unknown) {
      setActionError(apiErrorMessage(err, 'Failed to update the company.'));
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  // Resending is confirmed first, since it invalidates the link the admin may be using
  const [confirmResend, setConfirmResend] = useState<ICompany | null>(null);

  const resendActivation = async (c: ICompany) => {
    setBusyId(c.id);
    setActionError(null);
    try {
      setResent({ company: c, grant: await companyService.resendAdminActivation(c.id) });
    } catch (err: unknown) {
      setActionError(apiErrorMessage(err, 'Failed to issue a new activation.'));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        (status === 'all' || c.status === status) &&
        `${c.name} ${c.admin?.username ?? ''} ${c.admin?.email ?? ''}`.toLowerCase().includes(q),
    );
  }, [companies, status, search]);

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

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Company Management' }]}
        title="Company Management"
        description="Every company on the platform and the admin who runs it."
        actions={
          <Button
            variant="primary"
            icon={<Building2 className="size-4" />}
            onClick={() => navigate('/companies/new')}
          >
            Add company
          </Button>
        }
      />

      <StatTiles
        loading={loading}
        stats={[
          { label: 'Total companies', value: companies.length },
          {
            label: 'Admin awaiting activation',
            value: companies.filter((c) => c.admin?.status === 'invited').length,
          },
          {
            label: 'Deactivated companies',
            value: companies.filter((c) => c.status === 'deactivated').length,
          },
        ]}
      />

      {resent && (
        <ResentActivationNotice
          grant={resent.grant}
          email={resent.company.admin?.email}
          onDismiss={() => setResent(null)}
        >
          New activation issued for {resent.company.admin?.username ?? 'the admin'} of{' '}
          <span className="font-medium">{resent.company.name}</span>.
        </ResentActivationNotice>
      )}

      {actionError && <p className="text-sm text-critical">{actionError}</p>}

      <Panel className="bg-raised/30">
        <ListToolbar
          search={search}
          onSearch={setSearch}
          placeholder="FILTER BY COMPANY OR ADMIN..."
          loading={loading}
          onRefresh={reload}
          paging={paging}
        >
          <FilterSelect
            label="Status"
            allLabel="All Status"
            value={status}
            options={STATUS_OPTIONS}
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
          <CompanyTable
            companies={visible}
            loading={loading}
            emptyText={
              companies.length === 0
                ? 'No companies yet. Add one to onboard its admin.'
                : 'No companies match the current filters.'
            }
            busyId={busyId}
            onEdit={(c) => setEditingId(c.id)}
            onResendActivation={setConfirmResend}
            onToggleStatus={requestToggle}
          />
        )}
      </Panel>

      {editing && (
        <EditCompanyModal
          company={editing}
          onUpdated={replaceInList}
          onClose={() => setEditingId(null)}
        />
      )}

      {confirmResend?.admin && (
        <ResendActivationDialog
          name={confirmResend.admin.username}
          email={confirmResend.admin.email}
          onConfirm={async () => {
            await resendActivation(confirmResend);
            setConfirmResend(null);
          }}
          onCancel={() => setConfirmResend(null)}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title={`Deactivate ${deactivating.name}?`}
          confirmLabel="Deactivate company"
          onConfirm={() => changeStatus(deactivating, true)}
          onCancel={() => setDeactivating(null)}
        >
          <p>
            All {deactivating.userCount} user{deactivating.userCount === 1 ? '' : 's'} in this
            company, including its admin, will be signed out and unable to sign in.
          </p>
          <p>Nothing is deleted. You can reactivate the company at any time.</p>
        </ConfirmDialog>
      )}
    </Page>
  );
};
