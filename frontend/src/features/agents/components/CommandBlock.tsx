import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button.tsx';
import { copyText } from '../utils/copyText.ts';

interface ICommandBlockProps {
  label: string;
  command: string;
  // When set, the block shows this until Reveal is pressed. Copy always copies `command`.
  maskedCommand?: string;
}

export const CommandBlock: React.FC<ICommandBlockProps> = ({ label, command, maskedCommand }) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const shown = maskedCommand !== undefined && !revealed ? maskedCommand : command;

  const copy = async () => {
    try {
      await copyText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error('Copy failed. Select the text and copy it by hand.');
    }
  };

  return (
    <div className="overflow-hidden rounded border border-line-strong">
      <div className="flex items-center justify-between gap-2 border-b border-line-strong bg-raised px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.5px] text-muted">{label}</span>
        <div className="flex gap-1.5">
          {maskedCommand !== undefined && (
            <Button
              size="sm"
              variant="ghost"
              icon={revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              onClick={() => setRevealed((r) => !r)}
            >
              {revealed ? 'Hide' : 'Reveal'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            onClick={() => void copy()}
            aria-label={`Copy ${label}`}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
      <pre
        aria-label={label}
        className="max-h-96 overflow-auto bg-canvas p-3 font-mono text-xs leading-5 text-ink"
      >
        {shown}
      </pre>
    </div>
  );
};
