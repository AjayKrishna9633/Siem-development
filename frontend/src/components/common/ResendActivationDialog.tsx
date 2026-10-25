import React from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';

// Resending kills the current link and temporary password at once, so it is confirmed
// first: the person may be halfway through activating with the old ones
export const ResendActivationDialog: React.FC<{
  name: string;
  email: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}> = ({ name, email, onConfirm, onCancel }) => (
  <ConfirmDialog
    title="Send a new activation?"
    confirmLabel="Send new activation"
    tone="primary"
    onConfirm={onConfirm}
    onCancel={onCancel}
  >
    <p>
      <span className="text-ink">{name}</span> (<span className="font-mono text-xs">{email}</span>)
      gets a new activation email with a new link and temporary password.
    </p>
    <p>
      The link and temporary password sent before stop working immediately, even if they are using
      them right now.
    </p>
  </ConfirmDialog>
);
