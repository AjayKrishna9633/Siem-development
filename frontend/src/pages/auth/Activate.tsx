import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authService } from '../../services/auth.service.ts';
import { useAuthStore } from '../../store/auth.store.ts';
import type { IActivationPreview } from '../../types/auth.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { roleLabel } from '../../lib/roles.ts';
import { isActivationId } from '../../lib/validation.ts';
import { PASSWORD_MIN_LENGTH, newPasswordError } from '../../lib/password.ts';
import { AuthError, AuthInput, AuthLayout, AuthPasswordInput, AuthSubmit } from './AuthLayout.tsx';

export const Activate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const idFromLink = searchParams.get('id') ?? '';
  // A truncated or mangled link is caught here, without a request
  const linkMalformed = idFromLink !== '' && !isActivationId(idFromLink);
  const [activationId, setActivationId] = useState(linkMalformed ? '' : idFromLink);
  const [preview, setPreview] = useState<IActivationPreview | null>(null);
  const [loadingLink, setLoadingLink] = useState(Boolean(idFromLink) && !linkMalformed);
  const [linkError, setLinkError] = useState<string | null>(
    linkMalformed ? 'This activation link is incomplete or invalid.' : null,
  );

  // The activation email's fallback link carries the address so only the password is typed
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idFromLink || !isActivationId(idFromLink)) return;
    let active = true;
    authService
      .getActivation(idFromLink)
      .then((data) => {
        if (active) setPreview(data);
      })
      .catch((err: unknown) => {
        if (active)
          setLinkError(apiErrorMessage(err, 'This activation link is invalid or has expired.'));
      })
      .finally(() => {
        if (active) setLoadingLink(false);
      });
    return () => {
      active = false;
    };
  }, [idFromLink]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    try {
      const { activationId: id, ...details } = await authService.verifyActivation(
        email.trim(),
        temporaryPassword.trim(),
      );
      setActivationId(id);
      setPreview(details);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Email or temporary password is incorrect.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = newPasswordError(password, confirmPassword);
    if (problem) return setError(problem);

    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.activate(activationId, password);
      login(res.accessToken, res.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to activate account.'));
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <Link to="/login" className="text-accent hover:underline">
      Back to sign in
    </Link>
  );

  if (loadingLink) {
    return (
      <AuthLayout
        title="Activate Your Account"
        subtitle="Checking your activation link…"
        footer={footer}
      >
        <div className="flex justify-center py-6">
          <div className="size-8 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
        </div>
      </AuthLayout>
    );
  }

  if (preview) {
    return (
      <AuthLayout
        title="Activate Your Account"
        subtitle="Choose a password to finish setting up your account."
        footer={footer}
      >
        <form onSubmit={handleActivate} className="space-y-3">
          <div className="space-y-1 rounded border border-line-strong bg-canvas/60 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[1px] text-muted">
              Joining SIEMple
            </p>
            <p className="truncate text-sm text-ink">{preview.username}</p>
            <p className="truncate font-mono text-xs text-muted">{preview.email}</p>
            <span className="mt-1 inline-block rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-accent">
              {roleLabel[preview.role]}
            </span>
          </div>
          <AuthPasswordInput
            required
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`New password (min ${PASSWORD_MIN_LENGTH} characters)`}
            aria-label="New password"
          />
          <AuthPasswordInput
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            aria-label="Confirm new password"
          />
          <AuthError message={error} />
          <AuthSubmit disabled={submitting}>
            {submitting ? 'Activating…' : 'Activate & sign in'}
          </AuthSubmit>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Activate Your Account"
      subtitle="Enter your email and the temporary password you were given."
      footer={footer}
    >
      <form onSubmit={handleVerify} className="space-y-3">
        {linkError && (
          <p className="rounded border border-line-strong bg-canvas/60 p-3 text-xs text-muted">
            {linkError} You can still activate with your temporary password, or ask your admin for a
            new one.
          </p>
        )}
        <AuthInput
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
        />
        <AuthInput
          required
          autoComplete="one-time-code"
          value={temporaryPassword}
          onChange={(e) => setTemporaryPassword(e.target.value)}
          placeholder="Temporary password"
          aria-label="Temporary password"
          className="font-mono"
        />
        <AuthError message={error} />
        <AuthSubmit disabled={verifying || !email.trim() || !temporaryPassword.trim()}>
          {verifying ? 'Verifying…' : 'Continue'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
