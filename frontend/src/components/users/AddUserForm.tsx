import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { Field, Select } from '../ui/Form.tsx';
import { FormSection, PersonFields } from '../common/FormSection.tsx';
import { isValidPerson } from '../../lib/validation.ts';
import { teamService } from '../../services/team.service.ts';
import type { ITeamMemberWithActivation, UserRole } from '../../types/auth.ts';
import { ALL_ROLES, roleDescription, roleLabel } from '../../lib/roles.ts';
import { apiErrorMessage } from '../../lib/errors.ts';

interface IAddUserFormProps {
  onCreated: (result: ITeamMemberWithActivation) => void;
  onCancel: () => void;
}

// An admin adds anyone in the organization, choosing their role up front
export const AddUserForm: React.FC<IAddUserFormProps> = ({ onCreated, onCancel }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('t1_analyst');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = isValidPerson(username, email);
  // Set by the first submit: from then on every invalid field shows its message
  const [attempted, setAttempted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setAttempted(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      onCreated(await teamService.add({ username: username.trim(), email: email.trim(), role }));
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to add the user.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <FormSection title="Identity">
        <PersonFields
          name={username}
          email={email}
          onName={setUsername}
          onEmail={setEmail}
          showAllErrors={attempted}
        />
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
        You&apos;ll get an activation link and a temporary password to send them. They choose their
        own password when they activate.
      </p>

      {error && <p className="text-sm text-critical">{error}</p>}

      <div className="flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add user'}
        </Button>
      </div>
    </form>
  );
};
