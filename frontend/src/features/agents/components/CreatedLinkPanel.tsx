import React, { useState } from 'react';
import { Check, Copy, MessageSquareText, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button.tsx';
import { copyText } from '../utils/copyText.ts';
import { buildLinkMessage, formatLocal, formatRelative } from '../utils/linkMessage.ts';
import type { ICreatedEnrollmentLink } from '../types/agent.types.ts';

interface ICreatedLinkPanelProps {
  link: ICreatedEnrollmentLink;
}

// The link exists only in this component's props: SIEMple never shows it again.
export const CreatedLinkPanel: React.FC<ICreatedLinkPanelProps> = ({ link }) => {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);

  const copy = async (what: 'link' | 'message') => {
    try {
      await copyText(what === 'link' ? link.url : buildLinkMessage(link, new Date()));
      setCopied(what);
      setTimeout(() => setCopied(null), 2_000);
    } catch {
      toast.error('Copy failed. Select the text and copy it by hand.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded border border-line-strong">
        <div className="flex items-center justify-between gap-2 border-b border-line-strong bg-raised px-3 py-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.5px] text-muted">
            Enrollment link for {link.name}
          </span>
          <Button
            size="sm"
            variant="ghost"
            icon={
              copied === 'link' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />
            }
            onClick={() => void copy('link')}
            aria-label="Copy link"
          >
            {copied === 'link' ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p
          aria-label="Enrollment link"
          className="break-all bg-canvas p-3 font-mono text-xs leading-5 text-ink"
        >
          {link.url}
        </p>
      </div>

      <p className="text-sm text-muted">
        Expires{' '}
        <time dateTime={link.expiresAt} className="text-ink">
          {formatLocal(link.expiresAt)}
        </time>{' '}
        ({formatRelative(link.expiresAt, new Date())}).
      </p>

      <p
        role="note"
        className="flex items-start gap-2 rounded border border-high/40 bg-high/10 px-3 py-2 text-sm text-high"
      >
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        This link is shown only once and works for one install. Send it only to the person
        installing the agent; if it's lost, reissue it from the Agents page.
      </p>

      <Button
        icon={
          copied === 'message' ? (
            <Check className="size-4" />
          ) : (
            <MessageSquareText className="size-4" />
          )
        }
        onClick={() => void copy('message')}
      >
        {copied === 'message' ? 'Message copied' : 'Copy message'}
      </Button>
    </div>
  );
};
