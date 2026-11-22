import React from 'react';
import { Link } from 'react-router';
import { CircleCheck, LoaderCircle, TriangleAlert } from 'lucide-react';
import { Panel } from '@/components/ui/Panel.tsx';
import { useEnrollmentPolling } from '../hooks/useEnrollmentPolling.ts';
import { TROUBLESHOOTING } from '../constants/enrollment.ts';
import { AgentStatusBadge } from './AgentStatusBadge.tsx';
import type { IAgent } from '../types/agent.types.ts';

interface IEnrollmentWaiterProps {
  since: string;
  agentName: string | null;
}

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <dt className="font-mono text-[10px] uppercase tracking-[0.5px] text-muted">{label}</dt>
    <dd className="mt-0.5 text-sm text-ink">{value}</dd>
  </div>
);

const Connected: React.FC<{ agent: IAgent }> = ({ agent }) => (
  <Panel className="space-y-4 border-success/40 p-5" role="status">
    <div className="flex items-center gap-2 text-success">
      <CircleCheck className="size-5" />
      <h2 className="text-base font-medium">Connected</h2>
    </div>
    <dl className="grid gap-4 sm:grid-cols-4">
      <Detail label="Name" value={agent.name} />
      <Detail
        label="Operating system"
        value={[agent.os.name, agent.os.version].filter(Boolean).join(' ') || '—'}
      />
      <Detail label="IP" value={<span className="font-mono text-xs">{agent.ip ?? '—'}</span>} />
      <Detail label="Version" value={agent.version ?? '—'} />
    </dl>
    <Link
      to={`/agents?agent=${encodeURIComponent(agent.wazuhId)}`}
      className="inline-block text-sm text-accent hover:underline"
    >
      View the agent in Agents
    </Link>
  </Panel>
);

export const EnrollmentWaiter: React.FC<IEnrollmentWaiterProps> = ({ since, agentName }) => {
  const [target] = React.useState(() => ({ since, agentName }));
  const { agent, connected, timedOut, error } = useEnrollmentPolling(target);

  if (connected && agent) return <Connected agent={agent} />;

  return (
    <div className="space-y-4">
      <Panel className="flex items-start gap-3 p-5" role="status">
        <LoaderCircle className="mt-0.5 size-5 animate-spin text-accent" />
        <div className="space-y-1">
          <h2 className="text-base font-medium text-ink">Waiting for agent...</h2>
          {agent ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              {agent.name} has enrolled and is connecting <AgentStatusBadge status={agent.status} />
            </p>
          ) : (
            <p className="text-sm text-muted">
              {agentName
                ? `Checking every few seconds for ${agentName}.`
                : 'Checking every few seconds for a newly enrolled agent.'}
            </p>
          )}
          {error && <p className="text-sm text-high">{error}</p>}
        </div>
      </Panel>

      {timedOut && (
        <Panel className="space-y-3 border-high/40 p-5">
          <div className="flex items-center gap-2 text-high">
            <TriangleAlert className="size-5" />
            <h2 className="text-base font-medium">The agent hasn't connected yet</h2>
          </div>
          <p className="text-sm text-muted">
            Still checking. These are the usual reasons an agent doesn't appear:
          </p>
          <ul className="space-y-2.5">
            {TROUBLESHOOTING.map((tip) => (
              <li key={tip.title} className="text-sm">
                <span className="font-medium text-ink">{tip.title}.</span>{' '}
                <span className="text-muted">{tip.detail}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
};
