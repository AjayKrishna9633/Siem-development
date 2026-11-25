import React, { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus, RefreshCw, Server } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/PageHeader.tsx';
import { Panel } from '@/components/ui/Panel.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { EmptyState } from '@/components/ui/Misc.tsx';
import { useRemote } from '@/hooks/useRemote.ts';
import { can, useAuthStore } from '@/features/auth';
import { agentsService } from '../api/agentsApi.ts';
import { AgentTable } from '../components/AgentTable.tsx';

// TODO: read from the agents table once a sync job keeps it current; this asks Wazuh live.
export const AgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const canManage = can(user, 'agents.manage');

  const fetchAgents = useCallback(() => agentsService.list(), []);
  const { data, loading, error, reload } = useRemote(fetchAgents, 'Failed to load agents.');
  const agents = data ?? [];

  const addButton = canManage && (
    <Button
      variant="primary"
      icon={<Plus className="size-4" />}
      onClick={() => navigate('/agents/new')}
    >
      Add agent
    </Button>
  );

  return (
    <Page>
      <PageHeader
        title="Agents"
        description="Machines that send security events to SIEMple through Wazuh."
        icon={<Server className="size-5" />}
        actions={
          <>
            <Button icon={<RefreshCw className="size-4" />} onClick={reload} disabled={loading}>
              Refresh
            </Button>
            {addButton}
          </>
        }
      />

      {error && (
        <p
          role="alert"
          className="rounded border border-high/40 bg-high/10 px-3 py-2 text-sm text-high"
        >
          {error}
        </p>
      )}

      {!loading && !error && agents.length === 0 ? (
        <EmptyState
          icon={<Server className="size-6" />}
          title="No agents yet"
          description={
            canManage
              ? 'Add an agent to start collecting security events from a machine.'
              : 'An administrator can add agents.'
          }
        />
      ) : (
        <Panel className="overflow-x-auto">
          <AgentTable agents={agents} loading={loading} highlightId={params.get('agent')} />
        </Panel>
      )}
    </Page>
  );
};
