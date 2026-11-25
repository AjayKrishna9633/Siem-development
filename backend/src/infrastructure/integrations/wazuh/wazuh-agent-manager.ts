import type {
  IAgentManager,
  IAgentQuery,
} from '../../../application/interfaces/services/agent-manager.interface.ts';
import type { IAgent } from '../../../domain/types/agent.types.ts';
import { AgentStatus } from '../../../domain/enums/AgentStatus.ts';
import type { WazuhApiClient } from './wazuh-api.client.ts';

interface IWazuhList<T> {
  data?: { affected_items?: T[] };
}

interface IWazuhAgent {
  id?: string;
  name?: string;
  ip?: string;
  status?: string;
  os?: { name?: string; platform?: string; version?: string };
  version?: string;
  group?: string[];
  dateAdd?: string;
  lastKeepAlive?: string;
}

interface IWazuhInfo {
  data?: { api_version?: string };
}

const MANAGER_AGENT_ID = '000';
const AGENT_FIELDS =
  'id,name,ip,status,os.name,os.platform,os.version,version,group,dateAdd,lastKeepAlive';
const STATUSES = new Set<string>(Object.values(AgentStatus));
// Wazuh reports "never" as a far-future date for agents that haven't connected.
const FAR_FUTURE_YEAR = 9999;

const toDate = (value: string | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() >= FAR_FUTURE_YEAR) return null;
  return date;
};

export const toAgent = (raw: IWazuhAgent): IAgent | null => {
  if (!raw.id || !raw.name || raw.id === MANAGER_AGENT_ID) return null;
  return {
    wazuhId: raw.id,
    name: raw.name,
    ip: raw.ip && raw.ip !== 'any' ? raw.ip : null,
    status:
      raw.status && STATUSES.has(raw.status)
        ? (raw.status as AgentStatus)
        : AgentStatus.NEVER_CONNECTED,
    osName: raw.os?.name ?? null,
    osPlatform: raw.os?.platform ?? null,
    osVersion: raw.os?.version ?? null,
    version: raw.version ? raw.version.replace(/^Wazuh\s+/i, '') : null,
    groups: Array.isArray(raw.group) ? raw.group : [],
    registeredAt: toDate(raw.dateAdd),
    lastKeepAliveAt: toDate(raw.lastKeepAlive),
  };
};

export class WazuhAgentManager implements IAgentManager {
  constructor(private readonly _api: WazuhApiClient) {}

  async listGroups(): Promise<string[]> {
    const res = await this._api.get<IWazuhList<{ name?: string }>>('/groups', {
      limit: '500',
      select: 'name',
    });
    return (res.data?.affected_items ?? [])
      .map((g) => g.name)
      .filter((name): name is string => typeof name === 'string');
  }

  async listAgents(query: IAgentQuery = {}): Promise<IAgent[]> {
    const params: Record<string, string> = {
      select: AGENT_FIELDS,
      sort: '-dateAdd',
      q: `id!=${MANAGER_AGENT_ID}`,
      limit: String(query.limit ?? 500),
    };
    if (query.name !== undefined) params.name = query.name;
    const res = await this._api.get<IWazuhList<IWazuhAgent>>('/agents', params);

    const agents = (res.data?.affected_items ?? [])
      .map(toAgent)
      .filter((a): a is IAgent => a !== null);
    const since = query.registeredSince;
    return since
      ? agents.filter((a) => a.registeredAt !== null && a.registeredAt >= since)
      : agents;
  }

  async getManagerVersion(): Promise<string | null> {
    const res = await this._api.get<IWazuhInfo>('/');
    return res.data?.api_version ?? null;
  }
}
