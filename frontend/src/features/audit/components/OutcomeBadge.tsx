import React from 'react';
import { StatusBadge } from '@/components/ui/Badge.tsx';
import { OUTCOME_LABELS } from '../constants/actionLabels.ts';
import type { AuditOutcome } from '../types/audit.types.ts';

// A success is the normal case and stays quiet. A failure or a denial is what a reviewer is
// scanning for, so it takes the High (orange) colour. Red is kept for Critical alerts.
const TONE = { success: 'neutral', failure: 'high', denied: 'high' } as const;

export const OutcomeBadge: React.FC<{ outcome: AuditOutcome; className?: string }> = ({
  outcome,
  className,
}) => (
  <StatusBadge tone={TONE[outcome]} dot className={className}>
    {OUTCOME_LABELS[outcome]}
  </StatusBadge>
);
