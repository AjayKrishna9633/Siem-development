import { describe, expect, it } from 'vitest';
import type { ICacheService } from '../../src/application/interfaces/services/cache.service.interface.ts';
import {
  WazuhApiClient,
  type IHttpRequest,
  type IHttpResponse,
} from '../../src/infrastructure/integrations/wazuh/wazuh-api.client.ts';
import { WazuhAgentManager } from '../../src/infrastructure/integrations/wazuh/wazuh-agent-manager.ts';
import { PinoLogger, createRootLogger } from '../../src/infrastructure/logging/pino-logger.ts';
import { AppErrorCode } from '../../src/domain/enums/AppErrorCode.ts';

// Replies recorded from a real Wazuh 4.14.10 manager (key shortened).
const REPLIES = {
  registered: { data: { id: '001', key: 'MDAxIHdlYi0wMSBhbnkgZmFrZQ==' }, error: 0 },
  nameTaken: {
    title: 'Bad Request',
    detail: 'There is an agent with the same name: web-01',
    error: 1705,
  },
  badName: { title: 'Bad Request', detail: "'bad name!' is not a 'names' - 'name'" },
  grouped: {
    data: {
      affected_items: ['001'],
      total_affected_items: 1,
      total_failed_items: 0,
      failed_items: [],
    },
    error: 0,
  },
  groupMissing: { title: 'Resource Not Found', detail: 'The group does not exist', error: 1710 },
  deleted: {
    data: {
      affected_items: ['001'],
      total_affected_items: 1,
      total_failed_items: 0,
      failed_items: [],
    },
    error: 0,
  },
  alreadyGone: {
    data: {
      affected_items: [],
      total_affected_items: 0,
      total_failed_items: 1,
      failed_items: [{ error: { code: 1701, message: 'Agent does not exist' }, id: ['001'] }],
    },
    message: 'No agents were deleted',
    error: 1,
  },
  deleteFailed: {
    data: {
      affected_items: [],
      total_affected_items: 0,
      total_failed_items: 1,
      failed_items: [{ error: { code: 1726, message: 'Permission denied' }, id: ['001'] }],
    },
    error: 1,
  },
};

class MemoryCache implements ICacheService {
  private readonly _values = new Map<string, unknown>();
  async set<T>(key: string, value: T): Promise<void> {
    this._values.set(key, value);
  }
  async setIfAbsent<T>(key: string, value: T): Promise<boolean> {
    if (this._values.has(key)) return false;
    this._values.set(key, value);
    return true;
  }
  async get<T>(key: string): Promise<T | null> {
    return (this._values.get(key) as T) ?? null;
  }
  async delete(key: string): Promise<void> {
    this._values.delete(key);
  }
}

// One canned reply per API call; the login call is answered automatically.
const managerWith = (reply: { status: number; body: unknown }) => {
  const sent: IHttpRequest[] = [];
  const transport = async (req: IHttpRequest): Promise<IHttpResponse> => {
    sent.push(req);
    if (req.url.pathname === '/security/user/authenticate') {
      return { status: 200, body: JSON.stringify({ data: { token: 'jwt' } }) };
    }
    return { status: reply.status, body: JSON.stringify(reply.body) };
  };
  const client = new WazuhApiClient(
    {
      baseUrl: 'https://wazuh-manager:55000',
      username: 'siemple-api',
      password: 'secret',
      caFile: undefined,
      tlsInsecure: false,
    },
    new MemoryCache(),
    new PinoLogger(createRootLogger({ service: 'test', level: 'silent', pretty: false })),
    transport,
  );
  const calls = () => sent.filter((r) => r.url.pathname !== '/security/user/authenticate');
  return { manager: new WazuhAgentManager(client), calls };
};

describe('WazuhAgentManager.registerAgent', () => {
  it('posts the name with ip any and returns the id and key', async () => {
    const { manager, calls } = managerWith({ status: 200, body: REPLIES.registered });
    await expect(manager.registerAgent('web-01')).resolves.toEqual({
      wazuhId: '001',
      key: 'MDAxIHdlYi0wMSBhbnkgZmFrZQ==',
    });
    const [req] = calls();
    expect(req?.method).toBe('POST');
    expect(req?.url.pathname).toBe('/agents');
    expect(JSON.parse(req?.body ?? '')).toEqual({ name: 'web-01', ip: 'any' });
    expect(req?.headers['Content-Type']).toBe('application/json');
    expect(req?.headers['Content-Length']).toBe(String(Buffer.byteLength(req?.body ?? '')));
  });

  it('turns "same name" (1705) into AGENT_NAME_TAKEN', async () => {
    const { manager } = managerWith({ status: 400, body: REPLIES.nameTaken });
    await expect(manager.registerAgent('web-01')).rejects.toMatchObject({
      code: AppErrorCode.AGENT_NAME_TAKEN,
    });
  });

  it.each([
    ['another 400', { status: 400, body: REPLIES.badName }],
    ['a 200 without a key', { status: 200, body: { data: { id: '001' }, error: 0 } }],
    ['a 200 with an odd id', { status: 200, body: { data: { id: '../1', key: 'k' }, error: 0 } }],
  ])('treats %s as the manager being unavailable', async (_label, reply) => {
    const { manager } = managerWith(reply);
    await expect(manager.registerAgent('web-01')).rejects.toMatchObject({
      code: AppErrorCode.AGENT_MANAGER_UNAVAILABLE,
    });
  });
});

describe('WazuhAgentManager.assignGroup', () => {
  it('makes the group the only one', async () => {
    const { manager, calls } = managerWith({ status: 200, body: REPLIES.grouped });
    await manager.assignGroup('001', 'default');
    const [req] = calls();
    expect(req?.method).toBe('PUT');
    expect(req?.url.pathname).toBe('/agents/001/group/default');
    expect(req?.url.searchParams.get('force_single_group')).toBe('true');
  });

  it('turns "group does not exist" (1710) into AGENT_GROUP_NOT_FOUND', async () => {
    const { manager } = managerWith({ status: 404, body: REPLIES.groupMissing });
    await expect(manager.assignGroup('001', 'nope')).rejects.toMatchObject({
      code: AppErrorCode.AGENT_GROUP_NOT_FOUND,
    });
  });

  it('fails when the agent is not among the affected items', async () => {
    const { manager } = managerWith({
      status: 200,
      body: { data: { affected_items: [], failed_items: [] }, error: 1 },
    });
    await expect(manager.assignGroup('001', 'default')).rejects.toMatchObject({
      code: AppErrorCode.AGENT_MANAGER_UNAVAILABLE,
    });
  });
});

describe('WazuhAgentManager.removeAgent', () => {
  it('deletes the agent whatever its status', async () => {
    const { manager, calls } = managerWith({ status: 200, body: REPLIES.deleted });
    await manager.removeAgent('001');
    const [req] = calls();
    expect(req?.method).toBe('DELETE');
    expect(req?.url.pathname).toBe('/agents');
    expect(Object.fromEntries(req?.url.searchParams ?? [])).toEqual({
      agents_list: '001',
      status: 'all',
      older_than: '0s',
    });
  });

  it('succeeds when the agent is already gone (1701 inside a 200)', async () => {
    const { manager } = managerWith({ status: 200, body: REPLIES.alreadyGone });
    await expect(manager.removeAgent('001')).resolves.toBeUndefined();
  });

  it('fails on any other failed item, even though the status is 200', async () => {
    const { manager } = managerWith({ status: 200, body: REPLIES.deleteFailed });
    await expect(manager.removeAgent('001')).rejects.toMatchObject({
      code: AppErrorCode.AGENT_MANAGER_UNAVAILABLE,
    });
  });
});

describe('WazuhAgentManager.getAgentsById', () => {
  // Recorded from a real 4.14.10 manager: 999 doesn't exist, so the reply is partial but still 200.
  const PARTIAL = {
    data: {
      affected_items: [
        {
          id: '001',
          name: 'keys-deb',
          status: 'active',
          dateAdd: '2026-11-27T07:00:56+00:00',
          lastKeepAlive: '2026-11-27T07:02:07+00:00',
        },
        {
          id: '002',
          name: 'keys-rpm',
          status: 'never_connected',
          dateAdd: '2026-11-27T07:00:56+00:00',
        },
      ],
      total_affected_items: 2,
      total_failed_items: 1,
      failed_items: [{ error: { code: 1701, message: 'Agent does not exist' }, id: ['999'] }],
    },
    message: 'Some agents information was not returned',
    error: 2,
  };

  it('asks for all ids in one call and returns the ones Wazuh knows', async () => {
    const { manager, calls } = managerWith({ status: 200, body: PARTIAL });
    const agents = await manager.getAgentsById(['001', '002', '999', '001']);

    expect(calls()).toHaveLength(1);
    expect(calls()[0]?.url.searchParams.get('agents_list')).toBe('001,002,999');
    expect(agents.map((a) => [a.wazuhId, a.status, a.lastKeepAliveAt !== null])).toEqual([
      ['001', 'active', true],
      ['002', 'never_connected', false],
    ]);
  });

  it('never sends a malformed id, and makes no call when none is left', async () => {
    const { manager, calls } = managerWith({ status: 200, body: PARTIAL });
    await expect(manager.getAgentsById(['../1', '1,2', ''])).resolves.toEqual([]);
    expect(calls()).toHaveLength(0);
  });

  it('treats a failed call as the manager being unavailable', async () => {
    const { manager } = managerWith({ status: 500, body: { title: 'Internal Server Error' } });
    await expect(manager.getAgentsById(['001'])).rejects.toMatchObject({
      code: AppErrorCode.AGENT_MANAGER_UNAVAILABLE,
    });
  });
});
