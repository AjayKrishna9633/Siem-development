import React from 'react';
import { X } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import { Panel } from '../ui/Panel.tsx';
import { LinkDeliveryDetails } from '../common/LinkDeliveryDetails.tsx';
import type { ILinkDelivery } from '../../types/auth.ts';

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

export const IssueResetLinkDialog: React.FC<{
  email: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}> = ({ email, onConfirm, onCancel }) => (
  <ConfirmDialog
    title="Send a password reset link?"
    confirmLabel="Send reset link"
    tone="primary"
    onConfirm={onConfirm}
    onCancel={onCancel}
  >
    <p>
      <span className="font-mono text-xs text-ink">{email}</span> gets a single-use link, valid for
      30 minutes, to choose a new password. You never see or set the password yourself.
    </p>
    <p>Their current password keeps working until they use the link.</p>
  </ConfirmDialog>
);

export const LinkIssuedNotice: React.FC<{
  email: string;
  delivery: ILinkDelivery;
  kind: 'invite' | 'reset';
  onDismiss: () => void;
}> = ({ email, delivery, kind, onDismiss }) => (
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
      {kind === 'invite' ? 'New invitation issued.' : 'Password reset link issued.'} Any earlier
      link no longer works.
    </p>
    <LinkDeliveryDetails delivery={delivery} email={email} kind={kind} />
  </Panel>
);
