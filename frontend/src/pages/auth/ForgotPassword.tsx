import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { cn } from '../../lib/cn.ts';
import { AuthError, AuthLayout, authInputClass } from './AuthLayout.tsx';

type Step = 1 | 2 | 3;

const steps: { id: Step; label: string }[] = [
  { id: 1, label: 'Identify' },
  { id: 2, label: 'Verify' },
  { id: 3, label: 'Reset' },
];

const submitClass =
  'h-10 w-full rounded bg-accent text-sm font-medium text-canvas transition-colors hover:bg-[#c4d6ff] disabled:bg-line-strong/60 disabled:text-subtle';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, fallback));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await authService.sendOtp(email, 'reset');
      setStep(2);
    }, 'Failed to send the one-time code. Check the email address.');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const res = await authService.verifyOtp(email, otp, 'reset');
      if (!res.resetToken)
        throw new Error('Verification succeeded but no reset token was returned.');
      setResetToken(res.resetToken);
      setStep(3);
    }, 'Invalid or expired code.');
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError('Passphrases do not match');
    if (newPassword.length < 8) return setError('Passphrase must be at least 8 characters');
    void run(async () => {
      await authService.resetPassword({ email, resetToken, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    }, 'Passphrase reset failed.');
  };

  return (
    <AuthLayout
      title="Credential Recovery"
      subtitle="Verify your identity with a one-time code to set a new passphrase."
      footer={
        <Link to="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ol className="mb-6 grid grid-cols-3 gap-2">
        {steps.map((s) => (
          <li key={s.id} className="space-y-1.5">
            <span
              className={cn(
                'block h-0.5 rounded-full',
                step >= s.id ? 'bg-accent' : 'bg-line-strong',
              )}
            />
            <span
              className={cn(
                'block font-mono text-[10px] uppercase tracking-[1px]',
                step >= s.id ? 'text-accent' : 'text-subtle',
              )}
            >
              {s.id}. {s.label}
            </span>
          </li>
        ))}
      </ol>

      {success ? (
        <div className="space-y-2 py-4 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <p className="text-sm font-medium text-ink">Passphrase updated</p>
          <p className="text-xs text-muted">Redirecting you to sign in…</p>
        </div>
      ) : step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Operator email"
            aria-label="Email"
            className={authInputClass}
          />
          <AuthError message={error} />
          <button type="submit" disabled={loading || !email} className={submitClass}>
            {loading ? 'Sending code…' : 'Send one-time code'}
          </button>
        </form>
      ) : step === 2 ? (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <p className="text-xs text-muted">
            We sent a 6-digit code to <span className="font-mono text-ink">{email}</span>.
          </p>
          <input
            inputMode="numeric"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            aria-label="One-time code"
            className={cn(authInputClass, 'text-center font-mono text-lg tracking-[0.5em]')}
          />
          <AuthError message={error} />
          <button type="submit" disabled={loading || otp.length !== 6} className={submitClass}>
            {loading ? 'Verifying…' : 'Verify code'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setOtp('');
            }}
            className="w-full text-xs text-muted hover:text-ink"
          >
            Use a different email
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-3">
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New passphrase"
            aria-label="New password"
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
          <button type="submit" disabled={loading} className={submitClass}>
            {loading ? 'Updating…' : 'Set new passphrase'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
};
