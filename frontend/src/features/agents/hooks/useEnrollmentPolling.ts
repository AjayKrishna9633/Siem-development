import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiErrorMessage } from '@/lib/errors.ts';
import { agentsService } from '../api/agentsApi.ts';
import { ENROLLMENT_POLL_MS, ENROLLMENT_TIMEOUT_MS } from '../constants/enrollment.ts';
import type { IAgent } from '../types/agent.types.ts';

interface IPollTarget {
  since: string;
  agentName: string | null;
}

const isRateLimited = (err: unknown) => axios.isAxiosError(err) && err.response?.status === 429;

// Keeps checking after the timeout too: the troubleshooting tips show, but a late agent still
// flips the page to Connected. Mount it with a key per command, so each one starts fresh.
export const useEnrollmentPolling = (target: IPollTarget | null) => {
  const [agent, setAgent] = useState<IAgent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!target) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const tick = async () => {
      try {
        const result = await agentsService.checkEnrollment({
          since: target.since,
          ...(target.agentName && { agentName: target.agentName }),
        });
        if (!active) return;
        setError(null);
        if (result.found && result.agent) {
          setAgent(result.agent);
          if (result.agent.status === 'active') return;
        }
      } catch (err: unknown) {
        if (!active) return;
        if (!isRateLimited(err)) setError(apiErrorMessage(err, 'Could not check for the agent.'));
      }
      if (Date.now() - startedAt >= ENROLLMENT_TIMEOUT_MS) setTimedOut(true);
      timer = setTimeout(() => void tick(), ENROLLMENT_POLL_MS);
    };
    void tick();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [target]);

  const connected = agent?.status === 'active';
  return { agent, connected, timedOut: timedOut && !connected, error };
};
