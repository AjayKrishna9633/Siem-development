import React, { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import { PersonFields } from '../common/FormSection.tsx';
import { isValidPerson } from '../../lib/validation.ts';
import { companyService } from '../../services/company.service.ts';
import type { ICompany, ICompanyWithActivation } from '../../types/company.ts';
import { apiErrorMessage } from '../../lib/errors.ts';

// Hands the company to a new admin. The backend disables the current admin and
// signs them out, then onboards the new one with a fresh activation.
export const ReplaceAdminForm: React.FC<{
  company: ICompany;
  onReplaced: (result: ICompanyWithActivation) => void;
}> = ({ company, onReplaced }) => {
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = isValidPerson(adminName, adminEmail);
  // Set by the first submit: from then on every invalid field shows its message
  const [attempted, setAttempted] = useState(false);
  const current = company.admin;

  const [confirming, setConfirming] = useState(false);

  // With a sitting admin the change is confirmed first, since it locks them out
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setAttempted(true);
      return;
    }
    if (current) setConfirming(true);
    else void replace();
  };

  const replace = async () => {
    setSubmitting(true);
    setError(null);
    try {
      onReplaced(
        await companyService.replaceAdmin(company.id, {
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
        }),
      );
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to change the admin.'));
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="rounded border border-line-strong bg-canvas/50 p-3 text-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.5px] text-muted">Current admin</p>
        {current ? (
          <p className="mt-1 text-ink">
            {current.username} <span className="text-muted">· {current.email}</span>
          </p>
        ) : (
          <p className="mt-1 text-muted">No admin assigned</p>
        )}
      </div>

      <PersonFields
        name={adminName}
        email={adminEmail}
        onName={setAdminName}
        onEmail={setAdminEmail}
        showAllErrors={attempted}
      />

      {current && (
        <p className="flex gap-2 text-xs text-subtle">
          <TriangleAlert className="size-3.5 shrink-0 text-medium" />
          The current admin will be disabled and signed out. Analysts in the company are not
          affected.
        </p>
      )}

      {error && <p className="text-sm text-critical">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Changing…' : current ? 'Change admin' : 'Assign admin'}
        </Button>
      </div>

      {confirming && current && (
        <ConfirmDialog
          title="Change company admin?"
          confirmLabel="Change admin"
          onConfirm={replace}
          onCancel={() => setConfirming(false)}
        >
          <p>
            <span className="text-ink">{current.username}</span> will be disabled and signed out of{' '}
            <span className="text-ink">{company.name}</span> immediately.
          </p>
          <p>
            <span className="text-ink">{adminName.trim()}</span> (
            <span className="font-mono text-xs">{adminEmail.trim()}</span>) becomes the new admin
            and gets a fresh activation link.
          </p>
        </ConfirmDialog>
      )}
    </form>
  );
};
