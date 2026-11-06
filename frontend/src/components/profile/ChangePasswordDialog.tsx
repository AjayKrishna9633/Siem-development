import React, { useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';
import { Field } from '../ui/Form.tsx';
import { PasswordInput } from '../ui/PasswordInput.tsx';
import { useAuthStore } from '../../store/auth.store.ts';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { PASSWORD_MIN_LENGTH, newPasswordError } from '../../lib/password.ts';

export const ChangePasswordDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, login } = useAuthStore();
  const [done, setDone] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minLength = PASSWORD_MIN_LENGTH;
  const mismatch = confirmPassword !== '' && confirmPassword !== newPassword;
  const tooShort = newPassword !== '' && newPassword.length < minLength;
  const sameAsCurrent = newPassword !== '' && newPassword === currentPassword;
  const valid =
    currentPassword !== '' &&
    newPasswordError(newPassword, confirmPassword, minLength) === null &&
    !sameAsCurrent;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const session = await authService.changePassword({ currentPassword, newPassword });
      login(session.accessToken, { ...user, ...session.user });
      setDone(true);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Couldn't change the password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Change password" onClose={busy ? () => undefined : onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-ink">
            <CircleCheck className="size-5 text-success" /> Your password was changed.
          </p>
          <p className="text-sm text-muted">
            You&apos;re still signed in here. Every other device was signed out and will need the
            new password.
          </p>
          <div className="flex justify-end border-t border-line pt-4">
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Current password" required>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </Field>
          <Field
            label="New password"
            required
            hint={`At least ${minLength} characters.`}
            error={
              tooShort
                ? `Must be at least ${minLength} characters.`
                : sameAsCurrent
                  ? 'Must be different from your current password.'
                  : null
            }
          >
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              invalid={tooShort || sameAsCurrent}
            />
          </Field>
          <Field
            label="Confirm new password"
            required
            error={mismatch ? "Passwords don't match." : null}
          >
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              invalid={mismatch}
            />
          </Field>

          {error && <p className="text-sm text-critical">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!valid || busy}>
              {busy ? 'Changing…' : 'Change password'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
