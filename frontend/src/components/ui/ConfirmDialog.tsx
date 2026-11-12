import React, { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx';
import { cn } from '../../lib/cn.ts';

interface IConfirmDialogProps {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<IConfirmDialogProps> = ({
  title,
  children,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      size="sm"
      title={title}
      onClose={busy ? () => undefined : onCancel}
      icon={
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full border',
            tone === 'danger'
              ? 'border-critical/40 bg-critical/10 text-critical'
              : 'border-accent/40 bg-accent/10 text-accent',
          )}
        >
          <TriangleAlert className="size-4" />
        </span>
      }
    >
      <div className="space-y-2 text-sm leading-relaxed text-muted">{children}</div>
      <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
        <Button variant="outline" onClick={onCancel} disabled={busy} autoFocus>
          Cancel
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onClick={() => void confirm()}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};
