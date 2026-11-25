import React from 'react';
import { Table, THead, Th, Tr, Td } from '@/components/ui/Table.tsx';
import { Tag } from '@/components/ui/Badge.tsx';
import { LocalTime } from '@/components/common/LocalTime.tsx';
import { TableStatusRow } from '@/components/common/TableStatusRow.tsx';
import { AgentStatusBadge } from './AgentStatusBadge.tsx';
import type { IAgent } from '../types/agent.types.ts';

interface IAgentTableProps {
  agents: IAgent[];
  loading: boolean;
  highlightId?: string | null;
}

const osText = (agent: IAgent): string =>
  [agent.os.name, agent.os.version].filter(Boolean).join(' ') || '—';

export const AgentTable: React.FC<IAgentTableProps> = ({ agents, loading, highlightId }) => (
  <Table>
    <THead>
      <tr>
        <Th>Name</Th>
        <Th>Status</Th>
        <Th>IP</Th>
        <Th>Operating system</Th>
        <Th>Version</Th>
        <Th>Groups</Th>
        <Th>Last seen</Th>
      </tr>
    </THead>
    <tbody>
      {loading && agents.length === 0 ? (
        <TableStatusRow colSpan={7} mono>
          LOADING AGENTS...
        </TableStatusRow>
      ) : (
        agents.map((agent) => (
          <Tr
            key={agent.wazuhId}
            selected={agent.wazuhId === highlightId}
            aria-current={agent.wazuhId === highlightId ? 'true' : undefined}
          >
            <Td className="font-medium text-ink">{agent.name}</Td>
            <Td>
              <AgentStatusBadge status={agent.status} />
            </Td>
            <Td className="font-mono text-xs">{agent.ip ?? '—'}</Td>
            <Td>{osText(agent)}</Td>
            <Td className="font-mono text-xs">{agent.version ?? '—'}</Td>
            <Td>
              <div className="flex flex-wrap gap-1">
                {agent.groups.map((group) => (
                  <Tag key={group}>{group}</Tag>
                ))}
              </div>
            </Td>
            <Td>
              <LocalTime value={agent.lastKeepAliveAt} empty="Never" />
            </Td>
          </Tr>
        ))
      )}
    </tbody>
  </Table>
);
