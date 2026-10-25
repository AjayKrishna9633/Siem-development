import React, { useState } from 'react';
import { Check, Copy, MailCheck, MailWarning } from 'lucide-react';
import { Button } from '../ui/Button.tsx';
import { LocalTime } from './LocalTime.tsx';
import type { IActivationGrant } from '../../types/company.ts';

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

// Whether the activation reached their inbox, and what the creator should do about it
const EmailDeliveryNotice: React.FC<{ sent: boolean; email?: string }> = ({ sent, email }) => {
  const to = email ? <span className="font-mono text-ink">{email}</span> : 'them';
  return sent ? (
    <p className="flex gap-3 rounded border border-success/40 bg-success/10 p-3 text-sm text-ink">
      <MailCheck className="mt-0.5 size-4 shrink-0 text-success" />
      <span>
        Activation email sent to {to}. They can activate straight from their inbox. The details
        below are a backup in case it doesn&apos;t arrive.
      </span>
    </p>
  ) : (
    <p className="flex gap-3 rounded border border-medium/40 bg-medium/10 p-3 text-sm text-ink">
      <MailWarning className="mt-0.5 size-4 shrink-0 text-medium" />
      <span>
        We couldn&apos;t send the activation email to {to}. Share the link and temporary password
        below with them yourself.
      </span>
    </p>
  );
};

// The link and temporary password are shown once; either one is enough to activate
export const ActivationDetails: React.FC<{ grant: IActivationGrant; email?: string }> = ({
  grant,
  email,
}) => (
  <div className="space-y-3">
    <EmailDeliveryNotice sent={grant.emailSent} email={email} />
    <CopyRow label="Activation link" value={grant.activationLink} />
    <CopyRow label="Temporary password" value={grant.temporaryPassword} />
    <p className="font-mono text-[11px] text-muted">
      Expires <LocalTime value={grant.expiresAt} />. Either one lets them activate; neither is shown
      again.
    </p>
  </div>
);
