import React, { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../../lib/schemas.ts';
import { AuthError, AuthField, AuthInput, AuthLayout, AuthSubmit } from './AuthLayout.tsx';

export const ForgotPassword: React.FC = () => {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: ForgotPasswordValues) => {
    try {
      await authService.requestPasswordReset(email);
      setSentTo(email);
    } catch (err: unknown) {
      setError('root', {
        message: apiErrorMessage(err, "Couldn't request a reset link. Try again."),
      });
    }
  };

  const footer = (
    <Link to="/login" className="text-accent hover:underline">
      Back to sign in
    </Link>
  );

  if (sentTo) {
    return (
      <AuthLayout
        title="Check Your Email"
        subtitle="If the account exists, help is on its way."
        footer={footer}
      >
        <div className="space-y-3 text-sm text-muted">
          <p className="flex gap-3 rounded border border-line-strong bg-canvas/60 p-3 text-ink">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              If <span className="font-mono">{sentTo}</span> belongs to an active account and this
              server can send email, a reset link is on its way. It works once and expires in 30
              minutes.
            </span>
          </p>
          <p>
            Nothing arriving? This server may not be set up to send email. Ask your administrator
            for a reset link instead.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email and we'll send you a link to choose a new password."
      footer={footer}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <AuthField error={errors.email?.message}>
          <AuthInput
            type="email"
            autoFocus
            autoComplete="email"
            placeholder="Email address"
            aria-label="Email address"
            invalid={!!errors.email}
            {...register('email')}
          />
        </AuthField>
        <AuthError message={errors.root?.message ?? null} />
        <AuthSubmit disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
