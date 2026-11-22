import React from 'react';
import { StatusBadge } from '@/components/ui/Badge.tsx';
import { OUTCOME_LABELS } from '../constants/actionLabels.ts';
import type { AuditOutcome } from '../types/audit.types.ts';

const TONE = { success: 'neutral', failure: 'high', denied: 'high' } as const;

export const OutcomeBadge: React.FC<{ outcome: AuditOutcome; className?: string }> = ({
  outcome,
  className,
}) => (
  <StatusBadge tone={TONE[outcome]} dot className={className}>
    {OUTCOME_LABELS[outcome]}
  </StatusBadge>
);
