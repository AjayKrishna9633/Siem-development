import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { authService } from '../../services/auth.service.ts';
import { apiErrorMessage } from '../../lib/errors.ts';
import { cn } from '../../lib/cn.ts';
import { newPasswordError } from '../../lib/password.ts';
import type { ILoginRedirectState } from './Login.tsx';
import { CodeInput } from '../../components/common/VerificationCode.tsx';
import { AuthError, AuthInput, AuthLayout, AuthPasswordInput, AuthSubmit } from './AuthLayout.tsx';

type Step = 1 | 2 | 3;

const steps: { id: Step; label: string }[] = [
  { id: 1, label: 'Identify' },
  { id: 2, label: 'Verify' },
  { id: 3, label: 'Reset' },
];

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
    // A super admin's longer minimum comes back from the server, which knows the role
    const problem = newPasswordError(newPassword, confirmPassword);
    if (problem) return setError(problem);
    void run(async () => {
      await authService.resetPassword({ email, resetToken, newPassword });
      // Straight to sign-in, which shows a confirmation and fills in the email
      const state: ILoginRedirectState = { passwordReset: true, email };
      navigate('/login', { replace: true, state });
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

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <AuthInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Operator email"
            aria-label="Email"
          />
          <AuthError message={error} />
          <AuthSubmit disabled={loading || !email}>
            {loading ? 'Sending code…' : 'Send one-time code'}
          </AuthSubmit>
        </form>
      ) : step === 2 ? (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <p className="text-xs text-muted">
            If an account exists for <span className="font-mono text-ink">{email}</span>, we sent it
            a 6-digit code. It expires in 10 minutes; check spam if it doesn&apos;t arrive.
          </p>
          <CodeInput value={otp} onChange={setOtp} autoFocus />
          <AuthError message={error} />
          <AuthSubmit disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying…' : 'Verify code'}
          </AuthSubmit>
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
          <AuthPasswordInput
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New passphrase"
            aria-label="New password"
            autoComplete="new-password"
          />
          <AuthPasswordInput
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm passphrase"
            aria-label="Confirm password"
            autoComplete="new-password"
          />
          <AuthError message={error} />
          <AuthSubmit disabled={loading}>{loading ? 'Updating…' : 'Set new passphrase'}</AuthSubmit>
        </form>
      )}
    </AuthLayout>
  );
};
