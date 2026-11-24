import React from 'react';
import { StatusBadge } from '@/components/ui/Badge.tsx';
import type { EmailSource } from '../types/emailSettings.types.ts';

const LABEL: Readonly<Record<EmailSource, string>> = {
  none: 'Not configured',
  database: 'Configured',
  env: "Managed by the server's .env",
};

export const EmailStatusBadge: React.FC<{ source: EmailSource }> = ({ source }) => (
  <StatusBadge tone={source === 'none' ? 'neutral' : 'success'} dot>
    {LABEL[source]}
  </StatusBadge>
);
