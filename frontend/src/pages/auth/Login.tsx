import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store.ts';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { loginSchema, type LoginValues } from '../../lib/schemas.ts';
import {
  AuthError,
  AuthField,
  AuthInput,
  AuthLayout,
  AuthPasswordInput,
  AuthSubmit,
} from './AuthLayout.tsx';

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
  const from = redirect?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: redirect?.email ?? '', password: '' },
  });

  const onSubmit = async ({ email, password }: LoginValues) => {
    try {
      const res = await authService.login(email, password);
      login(res.accessToken, res.user);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError('root', { message: apiErrorMessage(err, 'Invalid credentials') });
    }
  };

  return (
    <AuthLayout
      title="Secure Access"
      subtitle="Authenticate to access SOC capabilities."
      footer={<span>Invited? Open the link in your invitation email.</span>}
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
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <AuthField error={errors.email?.message}>
          <AuthInput
            type="email"
            autoComplete="email"
            placeholder="Operator email"
            aria-label="Email"
            invalid={!!errors.email}
            {...register('email')}
          />
        </AuthField>

        <AuthField error={errors.password?.message}>
          <AuthPasswordInput
            autoComplete="current-password"
            autoFocus={!!redirect?.email}
            placeholder="Passphrase"
            aria-label="Password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </AuthField>

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-muted hover:text-accent">
            Forgot passphrase?
          </Link>
        </div>

        <AuthError message={errors.root?.message ?? null} />
        <AuthSubmit disabled={isSubmitting}>
          {isSubmitting ? 'Authenticating…' : 'Login'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
};
