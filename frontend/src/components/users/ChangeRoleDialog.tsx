import React, { useState } from 'react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';
import { Field, Select } from '../ui/Form.tsx';
import { ALL_ROLES, roleDescription, roleLabel } from '@/features/auth';
import type { IManagedUser } from '@/types/auth.ts';
import type { UserRole } from '@/features/auth';

export const ChangeRoleDialog: React.FC<{
  user: IManagedUser;
  onSave: (role: UserRole) => Promise<void>;
  onCancel: () => void;
}> = ({ user, onSave, onCancel }) => {
  const [role, setRole] = useState<UserRole>(user.role);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(role);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      size="sm"
      title="Change role"
      description={
        <>
          <span className="text-ink">{user.username ?? 'Invited user'}</span>{' '}
          <span className="font-mono text-xs">({user.email})</span>
        </>
      }
      onClose={busy ? () => undefined : onCancel}
    >
      <Field label="Role" hint={roleDescription[role]}>
        <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)} autoFocus>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel[r]}
            </option>
          ))}
        </Select>
      </Field>
      <p className="mt-3 text-xs text-subtle">
        Takes effect on their next action. They stay signed in.
      </p>
      <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => void save()} disabled={busy || role === user.role}>
          {busy ? 'Saving…' : 'Save role'}
        </Button>
      </div>
    </Modal>
  );
};
