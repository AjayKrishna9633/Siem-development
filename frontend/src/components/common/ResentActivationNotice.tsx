import React from 'react';
import { X } from 'lucide-react';
import { Panel } from '../ui/Panel.tsx';
import { ActivationDetails } from './ActivationDetails.tsx';
import type { IActivationGrant } from '../../types/auth.ts';

// Shown above a list after "resend activation": who it was for, delivery status,
// and the new link + temporary password as a backup
export const ResentActivationNotice: React.FC<{
  children: React.ReactNode;
  grant: IActivationGrant;
  email?: string;
  onDismiss: () => void;
}> = ({ children, grant, email, onDismiss }) => (
  <Panel className="relative space-y-3 bg-raised/50 p-4">
    <button
      type="button"
      onClick={onDismiss}
      className="absolute right-3 top-3 text-muted hover:text-ink"
      aria-label="Dismiss"
    >
      <X className="size-4" />
    </button>
    <p className="pr-6 text-sm text-ink">{children} The previous link no longer works.</p>
    <ActivationDetails grant={grant} email={email} />
  </Panel>
);
