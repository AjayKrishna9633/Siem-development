import React from 'react';
import { StatusBadge } from '@/components/ui/Badge.tsx';
import { STATUS_LABEL } from '../constants/enrollment.ts';
import type { AgentStatus } from '../types/agent.types.ts';

type Tone = React.ComponentProps<typeof StatusBadge>['tone'];

// Red stays reserved for Critical alerts, so a disconnected agent is orange.
const TONE: Readonly<Record<AgentStatus, Tone>> = {
  active: 'success',
  disconnected: 'high',
  pending: 'warning',
  never_connected: 'neutral',
};

export const AgentStatusBadge: React.FC<{ status: AgentStatus }> = ({ status }) => (
  <StatusBadge tone={TONE[status]} dot>
    {STATUS_LABEL[status]}
  </StatusBadge>
);
