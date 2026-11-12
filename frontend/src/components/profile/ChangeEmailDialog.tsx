import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  changeEmailSchema,
  verificationCodeSchema,
  type ChangeEmailValues,
  type VerificationCodeValues,
} from '../../lib/schemas.ts';

type Step = 'details' | 'verify' | 'done';

export const ChangeEmailDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, login } = useAuthStore();
  const [step, setStep] = useState<Step>('details');
  const [pending, setPending] = useState<ChangeEmailValues | null>(null);
  const [sent, setSent] = useState<ICodeSent | null>(null);

  const schema = useMemo(() => changeEmailSchema(user?.email ?? ''), [user?.email]);
  const detailsForm = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { newEmail: '', currentPassword: '' },
  });
  const codeForm = useForm({
    resolver: zodResolver(verificationCodeSchema),
    mode: 'onTouched',
    defaultValues: { code: '' },
  });

  const busy = detailsForm.formState.isSubmitting || codeForm.formState.isSubmitting;

  const sendCode = async (values: ChangeEmailValues) => {
    try {
      setSent(await authService.requestEmailChange(values));
      setPending(values);
      codeForm.reset();
      setStep('verify');
    } catch (err: unknown) {
      detailsForm.setError('root', {
        message: apiErrorMessage(err, "Couldn't send the code. Try again."),
      });
    }
  };

  const confirm = async ({ code }: VerificationCodeValues) => {
    try {
      const session = await authService.changeEmail(code);
      login(session.accessToken, { ...user, ...session.user });
      setStep('done');
    } catch (err: unknown) {
      codeForm.setError('root', { message: apiErrorMessage(err, "Couldn't change the email.") });
    }
  };

  const detailsErrors = detailsForm.formState.errors;
  const codeErrors = codeForm.formState.errors;

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
        <form onSubmit={detailsForm.handleSubmit(sendCode)} noValidate className="space-y-4">
          <div className="rounded border border-line-strong bg-canvas/50 p-3 text-sm">
            <p className="font-mono text-[10px] uppercase tracking-[0.5px] text-muted">
              Current email
            </p>
            <p className="mt-1 font-mono text-ink">{user?.email}</p>
          </div>
          <Field label="New email address" required error={detailsErrors.newEmail?.message}>
            <Input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              invalid={!!detailsErrors.newEmail}
              {...detailsForm.register('newEmail')}
            />
          </Field>
          <Field
            label="Current password"
            required
            hint="Confirms it's really you."
            error={detailsErrors.currentPassword?.message}
          >
            <PasswordInput
              autoComplete="current-password"
              invalid={!!detailsErrors.currentPassword}
              {...detailsForm.register('currentPassword')}
            />
          </Field>

          {detailsErrors.root && (
            <p className="text-sm text-critical">{detailsErrors.root.message}</p>
          )}

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send code to new email'}
            </Button>
          </div>
        </form>
      )}

      {step === 'verify' && sent && (
        <form onSubmit={codeForm.handleSubmit(confirm)} noValidate className="space-y-4">
          <p className="flex gap-3 rounded border border-success/40 bg-success/10 p-3 text-sm text-ink">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
            <span>
              We sent a code to <span className="font-mono">{sent.sentTo}</span>. Enter it to
              confirm you own this address. It expires in {sent.expiresInMinutes} minutes.
            </span>
          </p>

          <Field label="Verification code" required error={codeErrors.code?.message}>
            <Controller
              control={codeForm.control}
              name="code"
              render={({ field }) => (
                <CodeInput value={field.value} onChange={field.onChange} autoFocus />
              )}
            />
          </Field>
          <ResendCode
            onResend={async () => {
              if (!pending) return;
              setSent(await authService.requestEmailChange(pending));
              codeForm.reset();
            }}
          />

          {codeErrors.root && <p className="text-sm text-critical">{codeErrors.root.message}</p>}

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => {
                detailsForm.clearErrors('root');
                setStep('details');
              }}
              disabled={busy}
              className="text-sm text-muted hover:text-ink disabled:opacity-50"
            >
              Use a different email
            </button>
            <Button type="submit" variant="primary" disabled={busy}>
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
