import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { SUPER_ADMIN_PASSWORD_MIN_LENGTH } from '../../lib/password.ts';
import { AuthError, AuthInput, AuthLayout, AuthPasswordInput, AuthSubmit } from './AuthLayout.tsx';

export const SetupSuperAdmin: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.registerSuperAdmin({ email, username, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Setup failed. A super admin may already exist.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Platform Bootstrap"
      subtitle="Register the first super administrator for this SIEMple instance."
      footer={
        <Link to="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      {success ? (
        <div className="space-y-2 py-4 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <p className="text-sm font-medium text-ink">Super admin registered</p>
          <p className="text-xs text-muted">Redirecting you to sign in…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded border border-medium/30 bg-medium/5 px-3 py-2 text-[11px] leading-5 text-medium">
            One-time setup. This endpoint is locked once a super admin exists.
          </div>
          <AuthInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin email"
            aria-label="Email"
          />
          <AuthInput
            required
            minLength={2}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Display name"
            aria-label="Display name"
          />
          <AuthPasswordInput
            required
            minLength={SUPER_ADMIN_PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Passphrase (min ${SUPER_ADMIN_PASSWORD_MIN_LENGTH} characters)`}
            aria-label="Password"
            autoComplete="new-password"
          />
          <AuthError message={error} />
          <AuthSubmit disabled={loading}>
            {loading ? 'Registering…' : 'Register super admin'}
          </AuthSubmit>
        </form>
      )}
    </AuthLayout>
  );
};
