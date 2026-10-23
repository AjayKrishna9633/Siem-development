import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { authService } from '../../services/auth.service.ts';
import { useAuthStore } from '../../store/auth.store.ts';
import type { IVerifyInviteResponse } from '../../types/auth.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { roleLabel } from '../../lib/roles.ts';
import { AuthError, AuthLayout, authInputClass } from './AuthLayout.tsx';

const submitClass =
  'h-10 w-full rounded bg-accent text-sm font-medium text-canvas transition-colors hover:bg-[#c4d6ff] disabled:bg-line-strong/60 disabled:text-subtle';

export const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const tokenFromUrl = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenFromUrl);
  const [invite, setInvite] = useState<IVerifyInviteResponse | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const verify = async (value: string) => {
    if (!value) return;
    setVerifying(true);
    setError(null);
    try {
      const data = await authService.verifyInvite(value);
      setInvite(data);
      setUsername(data.username || '');
    } catch (err: unknown) {
      setInvite(null);
      setError(apiErrorMessage(err, 'Invalid or expired invitation token.'));
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!tokenFromUrl) return;
    let active = true;
    authService
      .verifyInvite(tokenFromUrl)
      .then((data) => {
        if (!active) return;
        setInvite(data);
        setUsername(data.username || '');
      })
      .catch((err: unknown) => {
        if (active) setError(apiErrorMessage(err, 'Invalid or expired invitation token.'));
      });
    return () => {
      active = false;
    };
  }, [tokenFromUrl]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError('Passphrases do not match');
    if (password.length < 8) return setError('Passphrase must be at least 8 characters');

    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.acceptInvite({ token: token.trim(), password, username });
      login(res.accessToken, res.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to activate account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={invite ? 'Activate Your Account' : 'Accept Invitation'}
      subtitle={
        invite
          ? 'Set a passphrase to finish onboarding.'
          : 'Paste the invitation token you received.'
      }
      footer={
        <Link to="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!invite ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify(token.trim());
          }}
          className="space-y-3"
        >
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Invitation token"
            aria-label="Invitation token"
            className={`${authInputClass} font-mono text-xs`}
          />
          <AuthError message={error} />
          <button type="submit" disabled={verifying || !token.trim()} className={submitClass}>
            {verifying ? 'Verifying…' : 'Verify invitation'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleAccept} className="space-y-3">
          <div className="rounded border border-line-strong bg-canvas/60 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[1px] text-muted">
              Invitation for
            </p>
            <p className="mt-1 truncate font-mono text-sm text-ink">{invite.email}</p>
            <span className="mt-2 inline-block rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.5px] text-accent">
              {roleLabel[invite.role]}
            </span>
          </div>
          <input
            required
            minLength={2}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Display name"
            aria-label="Display name"
            className={authInputClass}
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passphrase (min 8 characters)"
            aria-label="Password"
            className={authInputClass}
          />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm passphrase"
            aria-label="Confirm password"
            className={authInputClass}
          />
          <AuthError message={error} />
          <button type="submit" disabled={submitting} className={submitClass}>
            {submitting ? 'Activating…' : 'Activate & sign in'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
};
