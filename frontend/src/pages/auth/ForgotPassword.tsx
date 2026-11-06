import React, { useState } from 'react';
import { Link } from 'react-router';
import { MailCheck } from 'lucide-react';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { isEmail } from '../../lib/validation.ts';
import { AuthError, AuthInput, AuthLayout, AuthSubmit } from './AuthLayout.tsx';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const footer = (
    <Link to="/login" className="text-accent hover:underline">
      Back to sign in
    </Link>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setError('Enter a full email address, like name@company.com.');
    setBusy(true);
    setError(null);
    try {
      await authService.requestPasswordReset(email.trim());
      setSent(true);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Couldn't request a reset link. Try again."));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
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
              If <span className="font-mono">{email.trim()}</span> belongs to an active account and
              this server can send email, a reset link is on its way. It works once and expires in
              30 minutes.
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
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <AuthInput
          type="email"
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
        />
        <AuthError message={error} />
        <AuthSubmit disabled={busy || !email.trim()}>
          {busy ? 'Sending…' : 'Send reset link'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
