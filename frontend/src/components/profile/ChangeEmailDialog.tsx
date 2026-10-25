import React, { useState } from 'react';
import { CircleCheck, MailCheck } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';
import { Field, Input } from '../ui/Form.tsx';
import { PasswordInput } from '../ui/PasswordInput.tsx';
import { CodeInput, ResendCode } from '../common/VerificationCode.tsx';
import { useAuthStore } from '../../store/auth.store.ts';
import { authService } from '../../services/auth.service.ts';
import type { ICodeSent } from '../../types/auth.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { isEmail } from '../../lib/validation.ts';

type Step = 'details' | 'verify' | 'done';

// Super admin only: 1) new email + current password  2) code sent to the NEW inbox  3) done
export const ChangeEmailDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, login } = useAuthStore();
  const [step, setStep] = useState<Step>('details');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [sent, setSent] = useState<ICodeSent | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = isEmail(newEmail);
  const sameEmail = newEmail.trim().toLowerCase() === user?.email.toLowerCase();

  const requestCode = () =>
    authService.requestEmailChange({ newEmail: newEmail.trim(), currentPassword });

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || sameEmail || !currentPassword) return;
    setBusy(true);
    setError(null);
    try {
      setSent(await requestCode());
      setCode('');
      setStep('verify');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Couldn't send the code. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const session = await authService.changeEmail(code);
      login(session.accessToken, { ...user, ...session.user });
      setStep('done');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Couldn't change the email."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Change email address"
      description={
        step === 'details'
          ? 'This is the address you sign in with and where security emails go.'
          : undefined
      }
      onClose={busy ? () => undefined : onClose}
    >
      {step === 'details' && (
        <form onSubmit={sendCode} className="space-y-4">
          <div className="rounded border border-line-strong bg-canvas/50 p-3 text-sm">
            <p className="font-mono text-[10px] uppercase tracking-[0.5px] text-muted">
              Current email
            </p>
            <p className="mt-1 font-mono text-ink">{user?.email}</p>
          </div>
          <Field
            label="New email address"
            required
            error={sameEmail ? 'This is already your email address.' : null}
          >
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </Field>
          <Field label="Current password" required hint="Confirms it's really you.">
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>

          {error && <p className="text-sm text-critical">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!emailValid || sameEmail || !currentPassword || busy}
            >
              {busy ? 'Sending…' : 'Send code to new email'}
            </Button>
          </div>
        </form>
      )}

      {step === 'verify' && sent && (
        <form onSubmit={confirm} className="space-y-4">
          <p className="flex gap-3 rounded border border-success/40 bg-success/10 p-3 text-sm text-ink">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
            <span>
              We sent a code to <span className="font-mono">{sent.sentTo}</span>. Enter it to
              confirm you own this address. It expires in {sent.expiresInMinutes} minutes.
            </span>
          </p>

          <Field label="Verification code" required>
            <CodeInput value={code} onChange={setCode} autoFocus />
          </Field>
          <ResendCode
            onResend={async () => {
              setSent(await requestCode());
              setCode('');
            }}
          />

          {error && <p className="text-sm text-critical">{error}</p>}

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => {
                setStep('details');
                setError(null);
              }}
              disabled={busy}
              className="text-sm text-muted hover:text-ink disabled:opacity-50"
            >
              Use a different email
            </button>
            <Button type="submit" variant="primary" disabled={code.length !== 6 || busy}>
              {busy ? 'Confirming…' : 'Confirm new email'}
            </Button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-ink">
            <CircleCheck className="size-5 text-success" /> Your email is now{' '}
            <span className="font-mono">{user?.email}</span>
          </p>
          <p className="text-sm text-muted">
            Use it the next time you sign in. Other devices were signed out, and we let your old
            address know about the change.
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
