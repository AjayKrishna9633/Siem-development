import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { Field, Input, Select } from '../ui/Form.tsx';
import { FormSection } from '../common/FormSection.tsx';
import { isEmail } from '../../lib/validation.ts';
import { usersService } from '../../services/users.service.ts';
import type { IInviteResult, UserRole } from '../../types/auth.ts';
import { ALL_ROLES, roleDescription, roleLabel } from '../../lib/roles.ts';
import { apiErrorMessage } from '../../lib/errors.ts';

export const InviteUserForm: React.FC<{
  onInvited: (result: IInviteResult) => void;
  onCancel: () => void;
}> = ({ onInvited, onCancel }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('t1_analyst');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const emailError = !email.trim()
    ? 'Enter an email address.'
    : !isEmail(email)
      ? 'Enter a full email address, like name@company.com.'
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailError) {
      setAttempted(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      onInvited(await usersService.invite({ email: email.trim(), role }));
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to send the invitation.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <FormSection title="Who">
        <Field
          label="Email address"
          error={attempted ? emailError : undefined}
          className="max-w-sm"
        >
          <Input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
          />
        </Field>
      </FormSection>

      <FormSection title="Role">
        <Field label="System Role" hint={roleDescription[role]} className="max-w-sm">
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <p className="flex gap-3 rounded border border-line-strong bg-canvas/50 p-3 text-sm text-ink">
        <Info className="mt-0.5 size-4 shrink-0 text-muted" />
        They get a single-use link, valid for 48 hours, to choose their name and password. If this
        server can&apos;t send email, you&apos;ll get the link to send them yourself.
      </p>

      {error && <p className="text-sm text-critical">{error}</p>}

      <div className="flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Inviting…' : 'Send invitation'}
        </Button>
      </div>
    </form>
  );
};
