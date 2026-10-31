import React from 'react';
import { CircleCheck } from 'lucide-react';
import { ActivationDetails } from './ActivationDetails.tsx';
import type { IActivationGrant } from '../../types/auth.ts';

// Success screen after onboarding someone: what happened, whether the email went out,
// and the credentials as a backup
export const ActivationResult: React.FC<{
  title: React.ReactNode;
  recipient: { username: string; email: string } | null | undefined;
  grant: IActivationGrant;
  children?: React.ReactNode;
}> = ({ title, recipient, grant, children }) => (
  <div className="space-y-4 py-2">
    <p className="flex items-center gap-2 text-ink">
      <CircleCheck className="size-5 text-success" />
      {title}
    </p>
    <p className="text-sm text-muted">
      {recipient?.username ?? 'They'} can open the activation link, or enter their email and the
      temporary password on the activation page, then choose a password.
    </p>
    <ActivationDetails grant={grant} email={recipient?.email} />
    {children && <div className="flex gap-3 pt-2">{children}</div>}
  </div>
);
