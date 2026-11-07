import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '../../services/auth.service.ts';
import type { IPasswordResetPreview } from '../../types/auth.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import {
  PASSWORD_MIN_LENGTH,
  isLinkToken,
  resetPasswordSchema,
  type ResetPasswordValues,
} from '../../lib/schemas.ts';
import { LocalTime } from '../../components/common/LocalTime.tsx';
import type { ILoginRedirectState } from './Login.tsx';
import { AuthError, AuthField, AuthLayout, AuthPasswordInput, AuthSubmit } from './AuthLayout.tsx';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = (searchParams.get('token') ?? '').trim().toLowerCase();
  const malformed = !isLinkToken(token);

  const [preview, setPreview] = useState<IPasswordResetPreview | null>(null);
  const [loading, setLoading] = useState(!malformed);
  const [linkError, setLinkError] = useState<string | null>(
    malformed ? 'This reset link is incomplete. Open it again from where you got it.' : null,
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (malformed) return;
    let active = true;
    authService
      .getPasswordReset(token)
      .then((data) => {
        if (active) setPreview(data);
      })
      .catch((err: unknown) => {
        if (active) setLinkError(apiErrorMessage(err, 'This reset link is no longer valid.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, malformed]);

  const onSubmit = async ({ password }: ResetPasswordValues) => {
    try {
      await authService.resetPassword({ token, password });
      const state: ILoginRedirectState = { passwordReset: true, email: preview?.email };
      navigate('/login', { replace: true, state });
    } catch (err: unknown) {
      setError('root', { message: apiErrorMessage(err, 'The password could not be reset.') });
    }
  };

  const footer = (
    <Link to="/login" className="text-accent hover:underline">
      Back to sign in
    </Link>
  );

  if (loading) {
    return (
      <AuthLayout title="Reset Password" subtitle="Checking your reset link…" footer={footer}>
        <div className="flex justify-center py-6">
          <div className="size-8 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
        </div>
      </AuthLayout>
    );
  }

  if (!preview) {
    return (
      <AuthLayout title="Link Not Valid" subtitle="This reset link can't be used." footer={footer}>
        <div className="space-y-3 text-sm text-muted">
          <p className="rounded border border-line-strong bg-canvas/60 p-3">
            {linkError} Reset links work once and expire after 30 minutes.
          </p>
          <Link to="/forgot-password" className="block text-accent hover:underline">
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a New Password"
      subtitle="You'll be signed out everywhere, then sign in with the new password."
      footer={footer}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <div className="space-y-1 rounded border border-line-strong bg-canvas/60 p-3">
          <p className="truncate font-mono text-xs text-ink">{preview.email}</p>
          <p className="text-[11px] text-subtle">
            Link expires <LocalTime value={preview.expiresAt} />
          </p>
        </div>
        <AuthField error={errors.password?.message}>
          <AuthPasswordInput
            autoFocus
            autoComplete="new-password"
            placeholder={`New password (min ${PASSWORD_MIN_LENGTH} characters)`}
            aria-label="New password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </AuthField>
        <AuthField error={errors.confirmPassword?.message}>
          <AuthPasswordInput
            autoComplete="new-password"
            placeholder="Confirm new password"
            aria-label="Confirm new password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </AuthField>
        <AuthError message={errors.root?.message ?? null} />
        <AuthSubmit disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Set new password'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
