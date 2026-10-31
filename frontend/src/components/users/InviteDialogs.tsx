import React from 'react';
import { X } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import { Panel } from '../ui/Panel.tsx';
import { InviteDeliveryDetails } from '../common/InviteDeliveryDetails.tsx';
import type { IInviteDelivery } from '../../types/auth.ts';

// Resending kills the current link at once, so it is confirmed first: the person may be
// about to open the old one
export const ResendInviteDialog: React.FC<{
  email: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}> = ({ email, onConfirm, onCancel }) => (
  <ConfirmDialog
    title="Send a new invitation?"
    confirmLabel="Send new invitation"
    tone="primary"
    onConfirm={onConfirm}
    onCancel={onCancel}
  >
    <p>
      <span className="font-mono text-xs text-ink">{email}</span> gets a new invitation link, valid
      for another 48 hours.
    </p>
    <p>The link sent before stops working immediately.</p>
  </ConfirmDialog>
);

export const RevokeInviteDialog: React.FC<{
  email: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}> = ({ email, onConfirm, onCancel }) => (
  <ConfirmDialog
    title="Revoke this invitation?"
    confirmLabel="Revoke invitation"
    onConfirm={onConfirm}
    onCancel={onCancel}
  >
    <p>
      The invitation for <span className="font-mono text-xs text-ink">{email}</span> stops working
      and they are removed from the list. You can invite the same address again later.
    </p>
  </ConfirmDialog>
);

// Shown above the user list after a resend: where it went, and the link if it wasn't emailed
export const ResentInviteNotice: React.FC<{
  email: string;
  delivery: IInviteDelivery;
  onDismiss: () => void;
}> = ({ email, delivery, onDismiss }) => (
  <Panel className="relative space-y-3 bg-raised/50 p-4">
    <button
      type="button"
      onClick={onDismiss}
      className="absolute right-3 top-3 text-muted hover:text-ink"
      aria-label="Dismiss"
    >
      <X className="size-4" />
    </button>
    <p className="pr-6 text-sm text-ink">
      New invitation issued. The previous link no longer works.
    </p>
    <InviteDeliveryDetails delivery={delivery} email={email} />
  </Panel>
);
