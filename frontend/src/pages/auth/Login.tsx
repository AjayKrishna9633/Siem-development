import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, Grip } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store.ts';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { cn } from '../../lib/cn.ts';
import { AuthDivider, AuthError, AuthLayout, authInputClass } from './AuthLayout.tsx';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssoNotice, setSsoNotice] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

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
          <Link to="/accept-invite" className="text-accent hover:underline">
            Have an invite? Activate account
          </Link>
          <span className="text-subtle">·</span>
          <Link to="/setup-super-admin" className="text-muted hover:text-ink">
            First-run setup
          </Link>
        </div>
      }
    >
      <button
        type="button"
        onClick={() => setSsoNotice(true)}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded border border-line-strong bg-canvas text-sm font-medium text-ink transition-colors hover:border-accent/50"
      >
        <Grip className="size-4 text-muted" />
        Sign in with Azure AD
      </button>
      {ssoNotice && (
        <p className="mt-2 text-center text-[11px] text-muted">
          Azure AD SSO isn&apos;t configured for this workspace yet.
        </p>
      )}

      <AuthDivider label="Or local" />

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Operator email"
            aria-label="Email"
            className={cn(authInputClass, error && 'border-critical/60')}
          />
          <AuthError message={error} />
        </div>

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passphrase"
            aria-label="Password"
            className={cn(authInputClass, 'pr-10')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-muted hover:text-accent">
            Forgot passphrase?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="h-10 w-full rounded bg-accent text-sm font-medium text-canvas transition-colors hover:bg-[#c4d6ff] disabled:bg-line-strong/60 disabled:text-subtle"
        >
          {loading ? 'Authenticating…' : 'Login'}
        </button>
      </form>
    </AuthLayout>
  );
};
