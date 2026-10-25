import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { CircleCheck } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store.ts';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { AuthError, AuthInput, AuthLayout, AuthPasswordInput, AuthSubmit } from './AuthLayout.tsx';

// Other auth pages send people here with context, e.g. after a password reset
export interface ILoginRedirectState {
  from?: { pathname?: string };
  passwordReset?: boolean;
  email?: string;
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const redirect = location.state as ILoginRedirectState | null;
  const [email, setEmail] = useState(redirect?.email ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = redirect?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      login(res.accessToken, res.user);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Secure Access"
      subtitle="Authenticate to access SOC capabilities."
      footer={
        <div className="space-x-4">
          <Link to="/activate" className="text-accent hover:underline">
            Have an invite? Activate account
          </Link>
          <span className="text-subtle">·</span>
          <Link to="/setup-super-admin" className="text-muted hover:text-ink">
            First-run setup
          </Link>
        </div>
      }
    >
      {redirect?.passwordReset && (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded border border-success/40 bg-success/10 px-3 py-2 text-sm text-ink"
        >
          <CircleCheck className="size-4 shrink-0 text-success" />
          Password updated. Sign in with your new password.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <AuthInput
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Operator email"
            aria-label="Email"
            invalid={!!error}
          />
          <AuthError message={error} />
        </div>

        <AuthPasswordInput
          required
          autoComplete="current-password"
          autoFocus={!!redirect?.email}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passphrase"
          aria-label="Password"
        />

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-muted hover:text-accent">
            Forgot passphrase?
          </Link>
        </div>

        <AuthSubmit disabled={loading || !email || !password}>
          {loading ? 'Authenticating…' : 'Login'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
