import React from 'react';
import { AlertCircle } from 'lucide-react';
import { SvgIcon } from '@/components/ui/Misc.tsx';
import logoShield from '@/assets/icons/logo-shield.svg';
import { Input } from '@/components/ui/Form.tsx';
import { PasswordInput } from '@/components/ui/PasswordInput.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { cn } from '@/lib/cn.ts';

interface IAuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthLayout: React.FC<IAuthLayoutProps> = ({ title, subtitle, children, footer }) => (
  <div className="auth-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-4 py-12">
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/[0.06] via-transparent to-transparent" />
    <div className="pointer-events-none absolute left-1/2 top-1/3 size-[560px] -translate-x-1/2 rounded-full bg-low/10 blur-[140px]" />

    <div className="relative z-10 mb-6 text-center">
      <div className="flex items-center justify-center gap-2 text-accent">
        <SvgIcon src={logoShield} width={18} height={22} />
        <span className="text-[22px] font-bold uppercase tracking-tight text-ink">SIEMple</span>
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[2px] text-muted">SOC Ops</p>
    </div>

    <div className="relative z-10 w-full max-w-[420px] rounded-md border border-line-strong/80 bg-raised/90 px-7 py-8 shadow-2xl backdrop-blur">
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>
      {children}
    </div>

    {footer && <div className="relative z-10 mt-6 text-center text-xs text-muted">{footer}</div>}
  </div>
);

export const AuthError: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <p role="alert" className="flex items-center gap-1.5 text-xs text-critical">
      <AlertCircle className="size-3.5 shrink-0" />
      {message}
    </p>
  ) : null;

export const AuthField: React.FC<{ error?: string; children: React.ReactNode }> = ({
  error,
  children,
}) => (
  <div className="space-y-1.5">
    {children}
    <AuthError message={error ?? null} />
  </div>
);

const authFieldClass = 'h-10 bg-canvas/70';

type IAuthInputProps = React.ComponentProps<typeof Input>;

export const AuthInput: React.FC<IAuthInputProps> = ({ className, ...rest }) => (
  <Input className={cn(authFieldClass, className)} {...rest} />
);

export const AuthPasswordInput: React.FC<React.ComponentProps<typeof PasswordInput>> = ({
  className,
  ...rest
}) => <PasswordInput className={cn(authFieldClass, className)} {...rest} />;

export const AuthSubmit: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  ...rest
}) => <Button type="submit" variant="primary" className={cn('h-10 w-full', className)} {...rest} />;
