import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '../api/authApi.ts';
import { useAuthStore } from '../store/authStore.ts';
import type { IInvitePreview } from '../types/auth.types.ts';
import { apiErrorMessage } from '@/lib/errors.ts';
import { roleLabel } from '../utils/roles.ts';
import { PASSWORD_MIN_LENGTH, isLinkToken } from '@/utils/validation.ts';
import { acceptInviteSchema, type AcceptInviteValues } from '../schemas.ts';
import { LocalTime } from '@/components/common/LocalTime.tsx';
import {
  AuthError,
  AuthField,
  AuthInput,
  AuthLayout,
  AuthPasswordInput,
  AuthSubmit,
} from './AuthLayout.tsx';

export const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const token = (searchParams.get('token') ?? '').trim().toLowerCase();
  const malformed = !isLinkToken(token);

  const [preview, setPreview] = useState<IInvitePreview | null>(null);
  const [loading, setLoading] = useState(!malformed);
  const [linkError, setLinkError] = useState<string | null>(
    malformed ? 'This invitation link is incomplete. Open it again from your email.' : null,
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(acceptInviteSchema),
    mode: 'onTouched',
    defaultValues: { name: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (malformed) return;
    let active = true;
    authService
      .getInvite(token)
      .then((data) => {
        if (active) setPreview(data);
      })
      .catch((err: unknown) => {
        if (active) setLinkError(apiErrorMessage(err, 'This invitation link is no longer valid.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, malformed]);

  const onSubmit = async ({ name, password }: AcceptInviteValues) => {
    try {
      const session = await authService.acceptInvite({ token, name, password });
      login(session.accessToken, session.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError('root', {
        message: apiErrorMessage(err, 'The invitation could not be accepted.'),
      });
    }
  };

  const footer = (
    <Link to="/login" className="text-accent hover:underline">
      Already have an account? Sign in
    </Link>
  );

  if (loading) {
    return (
      <AuthLayout title="Accept Invitation" subtitle="Checking your invitation…" footer={footer}>
        <div className="flex justify-center py-6">
          <div className="size-8 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
        </div>
      </AuthLayout>
    );
  }

  if (!preview) {
    return (
      <AuthLayout title="Invitation Not Valid" subtitle="This link can't be used." footer={footer}>
        <p className="rounded border border-line-strong bg-canvas/60 p-3 text-sm text-muted">
          {linkError} Invitation links work once and expire after 48 hours; ask your administrator
          to send a new one.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Accept Invitation"
      subtitle="Choose your name and a password to finish setting up your account."
      footer={footer}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <div className="space-y-1 rounded border border-line-strong bg-canvas/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-muted">
            Joining {preview.orgName ?? 'SIEMple'}
          </p>
          <p className="truncate font-mono text-xs text-ink">{preview.email}</p>
          <span className="mt-1 inline-block rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-accent">
            {roleLabel[preview.role]}
          </span>
          <p className="pt-1 text-[11px] text-subtle">
            Link expires <LocalTime value={preview.expiresAt} />
          </p>
        </div>
        <AuthField error={errors.name?.message}>
          <AuthInput
            autoFocus
            autoComplete="name"
            placeholder="Full name"
            aria-label="Full name"
            invalid={!!errors.name}
            {...register('name')}
          />
        </AuthField>
        <AuthField error={errors.password?.message}>
          <AuthPasswordInput
            autoComplete="new-password"
            placeholder={`Password (min ${PASSWORD_MIN_LENGTH} characters)`}
            aria-label="Password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </AuthField>
        <AuthField error={errors.confirmPassword?.message}>
          <AuthPasswordInput
            autoComplete="new-password"
            placeholder="Confirm password"
            aria-label="Confirm password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </AuthField>
        <AuthError message={errors.root?.message ?? null} />
        <AuthSubmit disabled={isSubmitting}>
          {isSubmitting ? 'Setting up…' : 'Accept & sign in'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
