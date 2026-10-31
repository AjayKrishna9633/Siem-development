import React from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import type { IManagedUser } from '../../types/auth.ts';

// Disabling removes access immediately, so it is confirmed; enabling is confirmed too,
// since it restores access with the person's old password
export const UserStatusDialog: React.FC<{
  user: IManagedUser;
  enable: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}> = ({ user, enable, onConfirm, onCancel }) => (
  <ConfirmDialog
    title={enable ? 'Enable this user?' : 'Disable this user?'}
    confirmLabel={enable ? 'Enable user' : 'Disable user'}
    tone={enable ? 'primary' : 'danger'}
    onConfirm={onConfirm}
    onCancel={onCancel}
  >
    <p>
      <span className="text-ink">{user.username ?? 'Invited user'}</span> (
      <span className="font-mono text-xs">{user.email}</span>)
    </p>
    {enable ? (
      <p>They can sign in again with their existing password.</p>
    ) : (
      <p>They are signed out everywhere at once and can&apos;t sign in until re-enabled.</p>
    )}
  </ConfirmDialog>
);
