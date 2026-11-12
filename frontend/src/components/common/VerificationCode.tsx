import React, { useEffect, useState } from 'react';
import { Input } from '../ui/Form.tsx';

export const CodeInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}> = ({ value, onChange, autoFocus }) => (
  <Input
    value={value}
    onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
    inputMode="numeric"
    autoComplete="one-time-code"
    autoFocus={autoFocus}
    placeholder="000000"
    aria-label="6-digit verification code"
    className="h-12 text-center font-mono text-2xl tracking-[0.5em] placeholder:tracking-[0.5em]"
  />
);

const RESEND_COOLDOWN_SECONDS = 60;

export const ResendCode: React.FC<{ onResend: () => Promise<void> }> = ({ onResend }) => {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const resend = async () => {
    setSending(true);
    setError(null);
    try {
      await onResend();
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Couldn't send a new code. Try again shortly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <p className="text-xs text-muted">
      Didn&apos;t get it? Check spam, or{' '}
      {secondsLeft > 0 ? (
        <span className="text-subtle">resend in {secondsLeft}s</span>
      ) : (
        <button
          type="button"
          onClick={() => void resend()}
          disabled={sending}
          className="text-accent hover:underline disabled:opacity-50"
        >
          {sending ? 'sending…' : 'resend code'}
        </button>
      )}
      {error && <span className="ml-2 text-critical">{error}</span>}
    </p>
  );
};
