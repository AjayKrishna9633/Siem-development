import React, { useState } from 'react';
import { CircleCheck, CircleX, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Form.tsx';
import { apiErrorMessage } from '@/lib/errors.ts';
import { cn } from '@/lib/cn.ts';
import { emailSettingsService } from '../api/emailSettingsApi.ts';
import type { IEmailTestResult } from '../types/emailSettings.types.ts';

export const TestEmailPanel: React.FC<{ onTested: () => void }> = ({ onTested }) => {
  const [target, setTarget] = useState<'me' | 'other'>('me');
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<IEmailTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setResult(null);
    setError(null);
    try {
      setResult(await emailSettingsService.test(target === 'other' ? to.trim() : undefined));
      onTested();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'The test email could not be sent.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Send the test email to"
        className="flex flex-wrap gap-4 text-sm"
      >
        {(['me', 'other'] as const).map((value) => (
          <label key={value} className="flex items-center gap-2 text-ink">
            <input
              type="radio"
              name="test-target"
              checked={target === value}
              onChange={() => setTarget(value)}
            />
            {value === 'me' ? 'To me' : 'To another address'}
          </label>
        ))}
      </div>
      {target === 'other' && (
        <Input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="someone@example.com"
          aria-label="Test recipient"
          className="max-w-sm"
        />
      )}
      <Button
        icon={<Send className="size-4" />}
        onClick={() => void send()}
        disabled={sending || (target === 'other' && to.trim() === '')}
      >
        {sending ? 'Sending...' : 'Send test email'}
      </Button>

      {result && (
        <p
          role="status"
          className={cn(
            'flex items-start gap-2 rounded border px-3 py-2 text-sm',
            result.ok
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-high/40 bg-high/10 text-high',
          )}
        >
          {result.ok ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CircleX className="mt-0.5 size-4 shrink-0" />
          )}
          <span>
            {result.ok
              ? `Test email sent to ${result.to}. Check that inbox (and its spam folder).`
              : `${result.message}${result.responseCode ? ` (SMTP ${result.responseCode})` : ''}`}
          </span>
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded border border-high/40 bg-high/10 px-3 py-2 text-sm text-high"
        >
          {error}
        </p>
      )}
    </div>
  );
};
