import React, { useState } from 'react';
import { Check, Copy, MailCheck, MailWarning } from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { LocalTime } from './LocalTime.tsx';
import type { ILinkDelivery } from '../../types/auth.ts';

const CopyRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1">
      <p className="font-mono text-[10px] uppercase tracking-[0.5px] text-muted">{label}</p>
      <div className="flex items-center gap-2 rounded border border-line-strong bg-canvas p-2">
        <code className="flex-1 truncate px-1 font-mono text-xs text-accent">{value}</code>
        <Button
          size="sm"
          variant="secondary"
          onClick={copy}
          icon={
            copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />
          }
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
};

const copy = {
  invite: { noun: 'invitation', label: 'Invite link', action: 'accept it' },
  reset: { noun: 'reset link', label: 'Reset link', action: 'choose a new password' },
} as const;

export const LinkDeliveryDetails: React.FC<{
  delivery: ILinkDelivery;
  email?: string;
  kind?: keyof typeof copy;
}> = ({ delivery, email, kind = 'invite' }) => {
  const to = email ? <span className="font-mono text-ink">{email}</span> : 'them';
  const text = copy[kind];

  return (
    <div className="space-y-3">
      {delivery.delivered ? (
        <p className="flex gap-3 rounded border border-success/40 bg-success/10 p-3 text-sm text-ink">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
          <span>
            The {text.noun} was emailed to {to}. They {text.action} straight from their inbox.
          </span>
        </p>
      ) : (
        <p className="flex gap-3 rounded border border-medium/40 bg-medium/10 p-3 text-sm text-ink">
          <MailWarning className="mt-0.5 size-4 shrink-0 text-medium" />
          <span>
            The {text.noun} couldn&apos;t be emailed to {to} (email may not be set up on this
            server). Copy the link below and send it to them yourself.
          </span>
        </p>
      )}
      {delivery.link && <CopyRow label={text.label} value={delivery.link} />}
      <p className="font-mono text-[11px] text-muted">
        The link works once and expires <LocalTime value={delivery.expiresAt} />.
      </p>
    </div>
  );
};
