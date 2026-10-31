import React, { useState } from 'react';
import { CircleCheck, MailCheck, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';
import { Field } from '../ui/Form.tsx';
import { PasswordInput } from '../ui/PasswordInput.tsx';
import { CodeInput, ResendCode } from '../common/VerificationCode.tsx';
import { useAuthStore } from '../../store/auth.store.ts';
import { authService } from '../../services/auth.service.ts';
import type { ICodeSent } from '../../types/auth.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { PASSWORD_MIN_LENGTH, newPasswordError } from '../../lib/password.ts';

type Step = 'start' | 'verify' | 'done';

// Code first, then the change: 1) email a code  2) code + current + new password  3) done
export const ChangePasswordDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, login } = useAuthStore();
  const [step, setStep] = useState<Step>('start');
  const [sent, setSent] = useState<ICodeSent | null>(null);
  const [code, setCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      setSent(await authService.requestPasswordChange());
      setStep('verify');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Couldn't send the code. Try again."));
    } finally {
      setBusy(false);
    }
  };

  // A super admin needs a longer password, same as the backend enforces
  const minLength = PASSWORD_MIN_LENGTH;
  const mismatch = confirmPassword !== '' && confirmPassword !== newPassword;
  const tooShort = newPassword !== '' && newPassword.length < minLength;
  const sameAsCurrent = newPassword !== '' && newPassword === currentPassword;
  const valid =
    code.length === 6 &&
    currentPassword !== '' &&
    newPasswordError(newPassword, confirmPassword, minLength) === null &&
    !sameAsCurrent;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const session = await authService.changePassword({ code, currentPassword, newPassword });
      login(session.accessToken, { ...user, ...session.user });
      setStep('done');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Couldn't change the password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Change password"
      description={
        step === 'start'
          ? 'For your security, we confirm this with a code sent to your email.'
          : undefined
      }
      onClose={busy ? () => undefined : onClose}
    >
      {step === 'start' && (
        <div className="space-y-5">
          <p className="flex gap-3 rounded border border-line-strong bg-canvas/50 p-3 text-sm text-ink">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              We&apos;ll email a 6-digit code to <span className="font-mono">{user?.email}</span>.
              You&apos;ll enter it with your current and new password.
            </span>
          </p>
          {error && <p className="text-sm text-critical">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void sendCode()} disabled={busy}>
              {busy ? 'Sending…' : 'Send code'}
            </Button>
          </div>
        </div>
      )}

      {step === 'verify' && sent && (
        <form onSubmit={submit} className="space-y-4">
          <p className="flex gap-3 rounded border border-success/40 bg-success/10 p-3 text-sm text-ink">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
            <span>
              Code sent to <span className="font-mono">{sent.sentTo}</span>. It expires in{' '}
              {sent.expiresInMinutes} minutes.
            </span>
          </p>

          <Field label="Verification code" required>
            <CodeInput value={code} onChange={setCode} autoFocus />
          </Field>
          <ResendCode
            onResend={async () => {
              setSent(await authService.requestPasswordChange());
              setCode('');
            }}
          />

          <Field label="Current password" required>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
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

      {step === 'done' && (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-ink">
            <CircleCheck className="size-5 text-success" /> Your password was changed.
          </p>
          <p className="text-sm text-muted">
            You&apos;re still signed in here. Every other device was signed out and will need the
            new password. We also emailed you a confirmation.
          </p>
          <div className="flex justify-end border-t border-line pt-4">
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
