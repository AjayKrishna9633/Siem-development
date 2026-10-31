import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authService } from '../../services/auth.service.ts';
import { useAuthStore } from '../../store/auth.store.ts';
import type { IInvitePreview } from '../../types/auth.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { roleLabel } from '../../lib/roles.ts';
import { isLinkToken } from '../../lib/validation.ts';
import { PASSWORD_MIN_LENGTH, newPasswordError } from '../../lib/password.ts';
import { LocalTime } from '../../components/common/LocalTime.tsx';
import { AuthError, AuthInput, AuthLayout, AuthPasswordInput, AuthSubmit } from './AuthLayout.tsx';

// Where an invitation link lands: shows who it's for, then the person chooses their
// name and password and is signed in. The link works once.
export const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const token = (searchParams.get('token') ?? '').trim().toLowerCase();
  // A truncated or mangled link is caught here, without a request
  const malformed = !isLinkToken(token);

  const [preview, setPreview] = useState<IInvitePreview | null>(null);
  const [loading, setLoading] = useState(!malformed);
  const [linkError, setLinkError] = useState<string | null>(
    malformed ? 'This invitation link is incomplete. Open it again from your email.' : null,
  );

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem =
      name.trim().length < 2
        ? 'Enter your full name (at least 2 characters).'
        : newPasswordError(password, confirmPassword);
    if (problem) return setError(problem);

    setSubmitting(true);
    setError(null);
    try {
      const session = await authService.acceptInvite({ token, name: name.trim(), password });
      login(session.accessToken, session.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'The invitation could not be accepted.'));
    } finally {
      setSubmitting(false);
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
      <form onSubmit={handleAccept} noValidate className="space-y-3">
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
        <AuthInput
          autoFocus
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          aria-label="Full name"
        />
        <AuthPasswordInput
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`Password (min ${PASSWORD_MIN_LENGTH} characters)`}
          aria-label="Password"
        />
        <AuthPasswordInput
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          aria-label="Confirm password"
        />
        <AuthError message={error} />
        <AuthSubmit disabled={submitting}>
          {submitting ? 'Setting up…' : 'Accept & sign in'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
