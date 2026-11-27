import type {
  IAgentManager,
  IAgentQuery,
  IRegisteredAgent,
} from '../../../application/interfaces/services/agent-manager.interface.ts';
import type { IAgent } from '../../../domain/types/agent.types.ts';
import { AgentStatus } from '../../../domain/enums/AgentStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
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

// Wazuh's own error numbers, from its replies (checked against a real 4.14 manager).
const WAZUH_NAME_TAKEN = 1705;
const WAZUH_GROUP_NOT_FOUND = 1710;
const WAZUH_AGENT_NOT_FOUND = 1701;

interface IWazuhError {
  error?: number;
}

interface IWazuhRegistered extends IWazuhError {
  data?: { id?: unknown; key?: unknown };
}

interface IWazuhBulk extends IWazuhError {
  data?: {
    affected_items?: unknown[];
    failed_items?: { error?: { code?: number }; id?: unknown[] }[];
  };
}

// Keeps the agents_list query string short; Wazuh's own page limit is 500.
const AGENTS_PER_CALL = 500;

const WAZUH_AGENT_ID = /^\d{3,}$/;

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

  async registerAgent(name: string): Promise<IRegisteredAgent> {
    const res = await this._api.request<IWazuhRegistered>('POST', '/agents', {
      body: { name, ip: 'any' },
    });
    if (res.status === 400 && res.body.error === WAZUH_NAME_TAKEN) {
      throw new AppError(AppErrorCode.AGENT_NAME_TAKEN, ErrorMessage.AGENT_NAME_TAKEN);
    }
    const id = res.body.data?.id;
    const key = res.body.data?.key;
    if (res.status !== 200 || typeof id !== 'string' || !WAZUH_AGENT_ID.test(id)) {
      throw this._api.unavailable('Registering an agent failed', {
        status: res.status,
        error: res.body.error ?? null,
      });
    }
    if (typeof key !== 'string' || key === '') {
      throw this._api.unavailable('Registering an agent returned no key', { wazuhId: id });
    }
    return { wazuhId: id, key };
  }

  async assignGroup(wazuhId: string, group: string): Promise<void> {
    const res = await this._api.request<IWazuhBulk>(
      'PUT',
      `/agents/${encodeURIComponent(wazuhId)}/group/${encodeURIComponent(group)}`,
      { query: { force_single_group: 'true' } },
    );
    if (res.status === 404 && res.body.error === WAZUH_GROUP_NOT_FOUND) {
      throw new AppError(AppErrorCode.AGENT_GROUP_NOT_FOUND, ErrorMessage.AGENT_GROUP_NOT_FOUND);
    }
    if (res.status !== 200 || !res.body.data?.affected_items?.includes(wazuhId)) {
      throw this._api.unavailable('Assigning a group failed', {
        status: res.status,
        error: res.body.error ?? null,
        wazuhId,
      });
    }
  }

  // Wazuh answers 200 even when some ids are unknown: those come back as failed_items (1701) and
  // are simply missing from the result. Only well-formed ids are sent.
  async getAgentsById(wazuhIds: string[]): Promise<IAgent[]> {
    const ids = [...new Set(wazuhIds)].filter((id) => WAZUH_AGENT_ID.test(id));
    const agents: IAgent[] = [];
    for (let i = 0; i < ids.length; i += AGENTS_PER_CALL) {
      const res = await this._api.get<IWazuhList<IWazuhAgent>>('/agents', {
        agents_list: ids.slice(i, i + AGENTS_PER_CALL).join(','),
        select: AGENT_FIELDS,
        limit: String(AGENTS_PER_CALL),
      });
      for (const raw of res.data?.affected_items ?? []) {
        const agent = toAgent(raw);
        if (agent) agents.push(agent);
      }
    }
    return agents;
  }

  async removeAgent(wazuhId: string): Promise<void> {
    // Wazuh answers 200 even when nothing was deleted, with the reason in failed_items.
    const res = await this._api.request<IWazuhBulk>('DELETE', '/agents', {
      query: { agents_list: wazuhId, status: 'all', older_than: '0s' },
    });
    const data = res.body.data;
    const removed = res.status === 200 && data?.affected_items?.includes(wazuhId) === true;
    const alreadyGone =
      res.status === 200 &&
      data?.failed_items?.some(
        (item) => item.error?.code === WAZUH_AGENT_NOT_FOUND && item.id?.includes(wazuhId),
      ) === true;
    if (!removed && !alreadyGone) {
      throw this._api.unavailable('Removing an agent failed', {
        status: res.status,
        error: res.body.error ?? null,
        wazuhId,
      });
    }
  }
}
