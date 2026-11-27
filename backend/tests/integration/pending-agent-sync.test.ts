import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { container } from '../../src/infrastructure/di/container.ts';
import TYPES from '../../src/domain/constants/types.ts';
import type { IClock } from '../../src/application/interfaces/services/clock.interface.ts';
import type { ICacheService } from '../../src/application/interfaces/services/cache.service.interface.ts';
import type {
  ILogger,
  LogFields,
} from '../../src/application/interfaces/services/logger.interface.ts';
import type { IPendingAgentRepository } from '../../src/application/interfaces/repositories/pending-agent.repository.interface.ts';
import type { IAuditService } from '../../src/application/interfaces/services/audit.service.interface.ts';
import type { IRevokeEnrollmentLinkUseCase } from '../../src/application/interfaces/use-cases/agents.interface.ts';
import { AgentStatus } from '../../src/domain/enums/AgentStatus.ts';
import { UserRole } from '../../src/domain/enums/UserRole.ts';
import { FakeAgentManager, makeAgent } from '../helpers/fake-agent-manager.ts';

// A clock the tests move by hand.
class TestClock implements IClock {
  current = new Date('2026-11-27T12:00:00Z');
  now(): Date {
    return new Date(this.current);
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

class RecordingLogger implements ILogger {
  lines: { message: string; fields?: LogFields }[] = [];
  debug() {}
  info(message: string, fields?: LogFields) {
    this.lines.push({ message, fields });
  }
  warn(message: string, fields?: LogFields) {
    this.lines.push({ message, fields });
  }
  error(message: string, fields?: LogFields) {
    this.lines.push({ message, fields });
  }
  child(): ILogger {
    return this;
  }
}

// In-memory stand-in for Redis, so the tests never touch a real one.
class MemoryCache implements ICacheService {
  private readonly _values = new Map<string, { value: unknown; until: number }>();
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this._values.set(key, { value, until: Date.now() + ttl * 1000 });
  }
  async setIfAbsent<T>(key: string, value: T, ttl: number): Promise<boolean> {
    const existing = this._values.get(key);
    if (existing && existing.until > Date.now()) return false;
    this._values.set(key, { value, until: Date.now() + ttl * 1000 });
    return true;
  }
  async get<T>(key: string): Promise<T | null> {
    const existing = this._values.get(key);
    return existing && existing.until > Date.now() ? (existing.value as T) : null;
  }
  async delete(key: string): Promise<void> {
    this._values.delete(key);
  }
}

// Bound before the app is imported, so DI keeps these.
const manager = new FakeAgentManager();
const clock = new TestClock();
container.bind(TYPES.AgentManager).toConstantValue(manager);
container.bind(TYPES.Clock).toConstantValue(clock);

await import('../../src/app.ts');
const { AppDataSource } = await import('../../src/infrastructure/database/data-source.ts');
const { closeDatabase, recreateDatabase } = await import('../helpers/database.ts');
const { SyncPendingAgentsUseCase } =
  await import('../../src/application/use-cases/agents/sync-pending-agents.usecase.ts');
const { PendingAgentSyncJob } =
  await import('../../src/infrastructure/jobs/pending-agent-sync.job.ts');

const HOUR = 3_600_000;

const seed = async (wazuhId: string, expiresAt: Date, name = `agent-${wazuhId}`) => {
  const [row] = await AppDataSource.query<{ id: string }[]>(
    `INSERT INTO pending_agents (name, group_name, os, arch, wazuh_agent_id, agent_version,
       agent_key_ciphertext, agent_key_iv, agent_key_auth_tag, key_version)
     VALUES ($1, 'default', 'linux-deb', 'x86_64', $2, '4.14.10', 'c', 'i', 't', 1) RETURNING id`,
    [name, wazuhId],
  );
  await AppDataSource.query(
    `INSERT INTO enrollment_tokens (pending_agent_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [row?.id, randomBytes(32).toString('hex'), expiresAt],
  );
  return row?.id ?? '';
};

const state = async (id: string) => {
  const [row] = await AppDataSource.query<{ status: string; connected_at: Date | null }[]>(
    'SELECT status, connected_at FROM pending_agents WHERE id = $1',
    [id],
  );
  return row ?? null;
};

// audit_logs is append-only, so each test only looks at rows written since it started.
let testStartedAt = new Date(0);
const audits = (action: string) =>
  AppDataSource.query<
    { target_id: string; actor_id: string | null; actor_username: string; metadata: object }[]
  >(
    `SELECT target_id, actor_id, actor_username, metadata FROM audit_logs
      WHERE action = $1 AND occurred_at >= $2 ORDER BY occurred_at`,
    [action, testStartedAt],
  );

const removals = () =>
  manager.calls.filter((c) => c.method === 'removeAgent').map((c) => c.wazuhId);

describe('pending agent sync', () => {
  let logger: RecordingLogger;
  let sync: InstanceType<typeof SyncPendingAgentsUseCase>;

  beforeAll(async () => {
    await recreateDatabase();
  });
  afterAll(closeDatabase);

  beforeEach(async () => {
    manager.reset();
    clock.current = new Date('2026-11-27T12:00:00Z');
    logger = new RecordingLogger();
    sync = new SyncPendingAgentsUseCase(
      manager,
      container.get<IPendingAgentRepository>(TYPES.PendingAgentRepository),
      container.get<IAuditService>(TYPES.AuditService),
      clock,
      logger,
    );
    const [now] = await AppDataSource.query<{ t: Date }[]>('SELECT clock_timestamp() AS t');
    testStartedAt = now?.t ?? new Date();
    await AppDataSource.query('DELETE FROM pending_agents');
    await AppDataSource.query('DELETE FROM agents');
  });

  it('does nothing, and asks Wazuh nothing, while no agent is pending', async () => {
    const result = await sync.execute();
    expect(result.checked).toBe(0);
    expect(manager.calls).toHaveLength(0);
  });

  it('asks Wazuh about all pending agents in one call', async () => {
    await seed('101', new Date(clock.current.getTime() + HOUR));
    await seed('102', new Date(clock.current.getTime() + HOUR));
    await sync.execute();
    const batch = manager.calls.filter((c) => c.method === 'getAgentsById');
    expect(batch).toHaveLength(1);
    expect(batch[0]?.wazuhIds?.sort()).toEqual(['101', '102']);
  });

  it('marks an agent connected once Wazuh reports it active, with a system audit entry', async () => {
    const id = await seed('101', new Date(clock.current.getTime() + HOUR));
    manager.agents = [makeAgent({ wazuhId: '101', status: AgentStatus.ACTIVE })];

    const result = await sync.execute();

    expect(result.connected).toBe(1);
    expect(await state(id)).toEqual({ status: 'connected', connected_at: clock.current });
    const [entry] = await audits('agent.enrollment_link.connected');
    expect(entry).toMatchObject({ target_id: '101', actor_id: null, actor_username: 'system' });
  });

  it('counts an agent that connected and then disconnected as connected', async () => {
    const id = await seed('101', new Date(clock.current.getTime() + HOUR));
    manager.agents = [makeAgent({ wazuhId: '101', status: AgentStatus.DISCONNECTED })];
    await sync.execute();
    expect((await state(id))?.status).toBe('connected');
  });

  it('leaves a never-connected agent pending until its link expires', async () => {
    const id = await seed('101', new Date(clock.current.getTime() + HOUR));
    manager.agents = [
      makeAgent({ wazuhId: '101', status: AgentStatus.NEVER_CONNECTED, lastKeepAliveAt: null }),
    ];
    const result = await sync.execute();
    expect(result).toMatchObject({ connected: 0, expired: 0 });
    expect((await state(id))?.status).toBe('pending');
    expect(removals()).toEqual([]);
  });

  it('expires a never-connected agent: out of Wazuh first, then expired and audited', async () => {
    const id = await seed('101', new Date(clock.current.getTime() + HOUR));
    manager.agents = [
      makeAgent({ wazuhId: '101', status: AgentStatus.NEVER_CONNECTED, lastKeepAliveAt: null }),
    ];
    clock.advance(HOUR + 1);

    const result = await sync.execute();

    expect(result.expired).toBe(1);
    expect(removals()).toEqual(['101']);
    expect((await state(id))?.status).toBe('expired');
    const [entry] = await audits('agent.enrollment_link.expired');
    expect(entry).toMatchObject({ target_id: '101', actor_username: 'system' });
  });

  it('lets a connection win over an expiry seen in the same tick', async () => {
    const id = await seed('101', new Date(clock.current.getTime() - 1));
    manager.agents = [makeAgent({ wazuhId: '101', status: AgentStatus.ACTIVE })];
    await sync.execute();
    expect((await state(id))?.status).toBe('connected');
    expect(removals()).toEqual([]);
  });

  it('expires an agent someone already removed from Wazuh by hand', async () => {
    const id = await seed('101', new Date(clock.current.getTime() - 1));
    await sync.execute();
    expect(removals()).toEqual(['101']);
    expect((await state(id))?.status).toBe('expired');
  });

  it('keeps an expired agent pending when Wazuh will not remove it, and retries next tick', async () => {
    const id = await seed('101', new Date(clock.current.getTime() - 1));
    manager.failRemove = true;

    const first = await sync.execute();
    expect(first).toMatchObject({ expired: 0, removalFailed: 1 });
    expect((await state(id))?.status).toBe('pending');
    expect(await audits('agent.enrollment_link.expired')).toHaveLength(0);
    expect(logger.lines.some((l) => l.message.includes('Could not remove'))).toBe(true);

    manager.failRemove = false;
    const second = await sync.execute();
    expect(second.expired).toBe(1);
    expect((await state(id))?.status).toBe('expired');
  });

  it('changes nothing while Wazuh is unreachable, and never expires without removing', async () => {
    const expired = await seed('101', new Date(clock.current.getTime() - HOUR));
    const live = await seed('102', new Date(clock.current.getTime() + HOUR));
    manager.down = true;

    const result = await sync.execute();

    expect(result.managerUnavailable).toBe(true);
    expect(removals()).toEqual([]);
    expect((await state(expired))?.status).toBe('pending');
    expect((await state(live))?.status).toBe('pending');
    expect(await audits('agent.enrollment_link.expired')).toHaveLength(0);
    expect(logger.lines.some((l) => l.message.includes('Wazuh is unreachable'))).toBe(true);
  });

  it('skips an agent a revoke has locked, without waiting for it, and lets the revoke finish', async () => {
    const revoking = await seed('101', new Date(clock.current.getTime() - 1));
    const other = await seed('102', new Date(clock.current.getTime() - 1));
    // The revoke stops half-way, inside its Wazuh removal, holding its row lock.
    let releaseRevoke = () => {};
    let revokeIsRemoving = () => {};
    const removing = new Promise<void>((resolve) => (revokeIsRemoving = resolve));
    manager.beforeRemove = (async () => {
      revokeIsRemoving();
      await new Promise<void>((resolve) => (releaseRevoke = resolve));
    }) as () => Promise<void>;
    const revoke = container
      .get<IRevokeEnrollmentLinkUseCase>(TYPES.RevokeEnrollmentLinkUseCase)
      .execute({
        actor: { userId: '00000000-0000-4000-8000-000000000001', role: UserRole.ADMIN },
        id: revoking,
      });
    await removing;
    manager.beforeRemove = null;

    const started = Date.now();
    const result = await sync.execute();
    expect(Date.now() - started).toBeLessThan(3000);
    expect(result).toMatchObject({ expired: 1, skipped: 1 });
    expect((await state(other))?.status).toBe('expired');
    expect((await state(revoking))?.status).toBe('pending');

    releaseRevoke();
    await revoke;
    expect(await state(revoking)).toBeNull();
    const expiredIds = (await audits('agent.enrollment_link.expired')).map((a) => a.target_id);
    expect(expiredIds).toEqual(['102']);
  });

  it('removes at most two agents from Wazuh per tick; the rest wait for the next one', async () => {
    const ids = [];
    for (const wazuhId of ['101', '102', '103', '104', '105']) {
      ids.push(await seed(wazuhId, new Date(clock.current.getTime() - 1)));
    }
    // A connection is never held back by the limit.
    const connecting = await seed('106', new Date(clock.current.getTime() - 1));
    manager.agents = [makeAgent({ wazuhId: '106', status: AgentStatus.ACTIVE })];

    const first = await sync.execute();
    expect(first).toMatchObject({ expired: 2, deferred: 3, connected: 1 });
    expect(removals()).toEqual(['101', '102']);
    expect((await state(connecting))?.status).toBe('connected');

    const second = await sync.execute();
    expect(second).toMatchObject({ expired: 2, deferred: 1 });
    const third = await sync.execute();
    expect(third).toMatchObject({ expired: 1, deferred: 0 });
    for (const id of ids) expect((await state(id))?.status).toBe('expired');
  });

  it('counts a failed removal against the limit', async () => {
    await seed('101', new Date(clock.current.getTime() - 1));
    await seed('102', new Date(clock.current.getTime() - 1));
    await seed('103', new Date(clock.current.getTime() - 1));
    manager.failRemove = true;
    const result = await sync.execute();
    expect(result).toMatchObject({ removalFailed: 2, deferred: 1 });
    expect(removals()).toHaveLength(2);
  });

  it('applies each change once when two syncs run at the same time', async () => {
    await seed('101', new Date(clock.current.getTime() + HOUR));
    await seed('102', new Date(clock.current.getTime() - 1));
    manager.agents = [makeAgent({ wazuhId: '101', status: AgentStatus.ACTIVE })];

    const [a, b] = await Promise.all([sync.execute(), sync.execute()]);

    expect(a.connected + b.connected).toBe(1);
    expect(a.expired + b.expired).toBe(1);
    expect(await audits('agent.enrollment_link.connected')).toHaveLength(1);
    expect(await audits('agent.enrollment_link.expired')).toHaveLength(1);
  });

  it('runs only one tick at a time across replicas, through the lock', async () => {
    await seed('101', new Date(clock.current.getTime() + HOUR));
    const cache = new MemoryCache();
    const replicaA = new PendingAgentSyncJob(sync, cache, logger);
    const replicaB = new PendingAgentSyncJob(sync, cache, logger);

    const results = await Promise.all([replicaA.tick(), replicaB.tick(), replicaA.tick()]);

    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(manager.calls.filter((c) => c.method === 'getAgentsById')).toHaveLength(1);
    expect(await cache.get('lock:pending-agent-sync')).not.toBeNull();
  });

  it('never looks at or touches agents that are not pending enrollment links', async () => {
    await AppDataSource.query(
      `INSERT INTO agents (wazuh_id, name, status) VALUES ('050', 'phase1-agent', 'active')`,
    );
    const connected = await seed('060', new Date(clock.current.getTime() - HOUR));
    await AppDataSource.query(`UPDATE pending_agents SET status = 'connected' WHERE id = $1`, [
      connected,
    ]);
    const pending = await seed('101', new Date(clock.current.getTime() - 1));
    manager.agents = [
      makeAgent({ wazuhId: '050', name: 'phase1-agent', status: AgentStatus.DISCONNECTED }),
      makeAgent({ wazuhId: '060', status: AgentStatus.DISCONNECTED }),
    ];

    await sync.execute();

    const batch = manager.calls.find((c) => c.method === 'getAgentsById');
    expect(batch?.wazuhIds).toEqual(['101']);
    expect(removals()).toEqual(['101']);
    expect((await state(pending))?.status).toBe('expired');
    expect((await state(connected))?.status).toBe('connected');
    const [phase1] = await AppDataSource.query<{ status: string }[]>(
      `SELECT status FROM agents WHERE wazuh_id = '050'`,
    );
    expect(phase1?.status).toBe('active');
  });
});
