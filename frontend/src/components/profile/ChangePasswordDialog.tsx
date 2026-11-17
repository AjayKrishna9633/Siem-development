import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';
import { Field } from '../ui/Form.tsx';
import { PasswordInput } from '../ui/PasswordInput.tsx';
import { useAuthStore, authService } from '@/features/auth';
import { apiErrorMessage } from '@/lib/errors.ts';
import {
  PASSWORD_MIN_LENGTH,
  changePasswordSchema,
  type ChangePasswordValues,
} from '@/utils/validation.ts';

export const ChangePasswordDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, login } = useAuthStore();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async ({ currentPassword, newPassword }: ChangePasswordValues) => {
    try {
      const session = await authService.changePassword({ currentPassword, newPassword });
      login(session.accessToken, { ...user, ...session.user });
      setDone(true);
    } catch (err: unknown) {
      setError('root', { message: apiErrorMessage(err, "Couldn't change the password.") });
    }
  };

  return (
    <Modal title="Change password" onClose={isSubmitting ? () => undefined : onClose}>
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
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Current password" required error={errors.currentPassword?.message}>
            <PasswordInput
              autoComplete="current-password"
              autoFocus
              invalid={!!errors.currentPassword}
              {...register('currentPassword')}
            />
          </Field>
          <Field
            label="New password"
            required
            hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
            error={errors.newPassword?.message}
          >
            <PasswordInput
              autoComplete="new-password"
              invalid={!!errors.newPassword}
              {...register('newPassword')}
            />
          </Field>
          <Field label="Confirm new password" required error={errors.confirmPassword?.message}>
            <PasswordInput
              autoComplete="new-password"
              invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </Field>

          {errors.root && <p className="text-sm text-critical">{errors.root.message}</p>}

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Changing…' : 'Change password'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
