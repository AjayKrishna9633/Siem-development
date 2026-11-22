import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { container } from '../../src/infrastructure/di/container.ts';
import TYPES from '../../src/domain/constants/types.ts';
import type { IAgentEnrollmentConfig } from '../../src/application/types/use-case/agent.types.ts';
import { AgentStatus } from '../../src/domain/enums/AgentStatus.ts';
import { ENROLLMENT_PASSWORD, FakeAgentManager, makeAgent } from '../helpers/fake-agent-manager.ts';
import type { ISignedInUser } from '../helpers/users.ts';

// Bound before the app is imported, so DI keeps these instead of the real Wazuh client.
const manager = new FakeAgentManager();
const config: IAgentEnrollmentConfig = {
  publicAddress: '192.168.1.20',
  enrollmentPassword: ENROLLMENT_PASSWORD,
  fallbackAgentVersion: '4.14.10',
};
container.bind(TYPES.AgentManager).toConstantValue(manager);
container.bind(TYPES.AgentEnrollmentConfig).toConstantValue(config);

const { default: app } = (await import('../../src/app.ts')) as { default: Express };
const { AppDataSource } = await import('../../src/infrastructure/database/data-source.ts');
const { closeDatabase, recreateDatabase } = await import('../helpers/database.ts');
const { addActiveUser, setupFirstAdmin } = await import('../helpers/users.ts');

const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });

const enroll = (user: ISignedInUser, body: Record<string, unknown>) =>
  request(app).post('/api/agents/enroll-command').set(as(user)).send(body);

describe('agents API', () => {
  let admin: ISignedInUser;
  let checker: ISignedInUser;
  let limited: ISignedInUser;
  let t1: ISignedInUser;
  let t2: ISignedInUser;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    checker = await addActiveUser(app, admin, 'checker@example.com', 'admin');
    limited = await addActiveUser(app, admin, 'limited@example.com', 'admin');
    t1 = await addActiveUser(app, admin, 't1@example.com', 't1_analyst');
    t2 = await addActiveUser(app, admin, 't2@example.com', 't2_analyst');
  });
  afterAll(closeDatabase);

  beforeEach(() => {
    manager.reset();
    config.publicAddress = '192.168.1.20';
    config.enrollmentPassword = ENROLLMENT_PASSWORD;
  });

  describe('access', () => {
    it('requires sign-in', async () => {
      await request(app).get('/api/agents/groups').expect(401);
    });

    it.each(['t1', 't2'])(
      'forbids %s on every endpoint (agents.manage is admin-only)',
      async (who) => {
        const user = who === 't1' ? t1 : t2;
        await request(app).get('/api/agents/groups').set(as(user)).expect(403);
        await enroll(user, { os: 'windows', group: 'default' }).expect(403);
        await request(app)
          .get(`/api/agents/enrollment-check?since=${new Date().toISOString()}`)
          .set(as(user))
          .expect(403);
        expect(manager.calls).toEqual([]);
      },
    );
  });

  it('lets an analyst list agents (agents.view)', async () => {
    manager.agents = [makeAgent({ wazuhId: '003', name: 'fs-01' })];
    const res = await request(app).get('/api/agents').set(as(t1)).expect(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({ wazuhId: '003', name: 'fs-01', status: 'active' }),
    ]);
  });

  it('lists the Wazuh groups', async () => {
    const res = await request(app).get('/api/agents/groups').set(as(admin)).expect(200);
    expect(res.body.data).toEqual(['default', 'windows-servers']);
  });

  describe('POST /api/agents/enroll-command', () => {
    it('returns the command with Cache-Control: no-store and audits it without the secret', async () => {
      const res = await enroll(admin, {
        os: 'linux-deb',
        arch: 'arm64',
        group: 'default',
        agentName: 'db-01',
      }).expect(200);

      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body.data).toMatchObject({
        os: 'linux-deb',
        arch: 'arm64',
        managerAddress: '192.168.1.20',
        ports: [1514, 1515],
        agentVersion: '4.14.10',
        group: 'default',
        agentName: 'db-01',
      });
      expect(res.body.data.command).toContain(ENROLLMENT_PASSWORD);
      expect(res.body.data.command).toContain('wazuh-agent_4.14.10-1_arm64.deb');
      expect(res.body.data.maskedCommand).not.toContain(ENROLLMENT_PASSWORD);
      expect(new Date(res.body.data.generatedAt).toString()).not.toBe('Invalid Date');

      const rows = await AppDataSource.query<
        {
          action: string;
          category: string;
          actor_id: string;
          target_label: string;
          metadata: unknown;
        }[]
      >(`SELECT * FROM audit_logs WHERE action = 'agent.enroll_command.generated'`);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        category: 'agent',
        actor_id: admin.id,
        target_label: 'db-01',
        metadata: { os: 'linux-deb', arch: 'arm64', group: 'default', agentName: 'db-01' },
      });
      expect(JSON.stringify(rows)).not.toContain(ENROLLMENT_PASSWORD);
    });

    it.each([
      ['an unknown os', { os: 'macos', group: 'default' }],
      ['an unsafe group', { os: 'windows', group: 'default;rm -rf /' }],
      ['an unsafe name', { os: 'windows', group: 'default', agentName: "x'; whoami" }],
      ['a 65-character name', { os: 'windows', group: 'default', agentName: 'a'.repeat(65) }],
      ['no group', { os: 'windows' }],
    ])('answers 400 for %s', async (_label, body) => {
      const res = await enroll(admin, body).expect(400);
      expect(res.body.success).toBe(false);
      expect(manager.calls).toEqual([]);
    });

    it('answers 400 for a group Wazuh does not have', async () => {
      const res = await enroll(admin, { os: 'windows', group: 'nope' }).expect(400);
      expect(res.body.code).toBe('AGENT_GROUP_NOT_FOUND');
    });

    it('answers 409 for a name an active agent uses', async () => {
      manager.agents = [makeAgent({ name: 'web-01', status: AgentStatus.ACTIVE })];
      const res = await enroll(admin, {
        os: 'windows',
        group: 'default',
        agentName: 'web-01',
      }).expect(409);
      expect(res.body.code).toBe('AGENT_NAME_TAKEN');
    });

    it('answers 409 with a clear message when WAZUH_PUBLIC_ADDRESS is not set', async () => {
      config.publicAddress = undefined;
      const res = await enroll(admin, { os: 'windows', group: 'default' }).expect(409);
      expect(res.body.code).toBe('AGENT_ENROLLMENT_NOT_CONFIGURED');
      expect(res.body.message).toContain('Set WAZUH_PUBLIC_ADDRESS in .env');
    });
  });

  describe('when Wazuh is unreachable', () => {
    it('answers 503 AGENT_MANAGER_UNAVAILABLE on every endpoint, with no stack trace', async () => {
      manager.down = true;
      const responses = [
        await request(app).get('/api/agents/groups').set(as(admin)),
        await enroll(admin, { os: 'windows', group: 'default' }),
        await request(app)
          .get(`/api/agents/enrollment-check?since=${new Date().toISOString()}`)
          .set(as(admin)),
      ];
      for (const res of responses) {
        expect(res.status).toBe(503);
        expect(res.body.code).toBe('AGENT_MANAGER_UNAVAILABLE');
        expect(JSON.stringify(res.body)).not.toMatch(/at \w+ \(|\.ts:\d+/);
      }
    });
  });

  describe('GET /api/agents/enrollment-check', () => {
    it('reports the new agent and stores it in the agents table', async () => {
      const since = new Date(Date.now() - 5_000);
      const res1 = await request(app)
        .get(`/api/agents/enrollment-check?agentName=web-02&since=${since.toISOString()}`)
        .set(as(checker))
        .expect(200);
      expect(res1.headers['cache-control']).toBe('no-store');
      expect(res1.body.data).toEqual({ found: false, agent: null });

      manager.agents = [makeAgent({ wazuhId: '012', name: 'web-02', groups: ['default', 'web'] })];
      await new Promise((r) => setTimeout(r, 3_100));
      const res2 = await request(app)
        .get(`/api/agents/enrollment-check?agentName=web-02&since=${since.toISOString()}`)
        .set(as(checker))
        .expect(200);
      expect(res2.body.data.found).toBe(true);
      expect(res2.body.data.agent).toMatchObject({
        wazuhId: '012',
        name: 'web-02',
        status: 'active',
        ip: '192.168.1.50',
        version: 'v4.14.10',
        os: { platform: 'windows' },
      });

      const [row] = await AppDataSource.query<
        { name: string; groups: string[]; removed_at: Date | null }[]
      >(`SELECT name, groups, removed_at FROM agents WHERE wazuh_id = '012'`);
      expect(row).toEqual({ name: 'web-02', groups: ['default', 'web'], removed_at: null });
    });

    it('allows one check per user every 3 seconds', async () => {
      const url = `/api/agents/enrollment-check?since=${new Date().toISOString()}`;
      await request(app).get(url).set(as(limited)).expect(200);
      const res = await request(app).get(url).set(as(limited)).expect(429);
      expect(res.body.success).toBe(false);
      // A different user has their own budget.
      await request(app).get(url).set(as(admin)).expect(200);
    });

    it('answers 400 without a valid since', async () => {
      await request(app)
        .get('/api/agents/enrollment-check?since=yesterday')
        .set(as(t1))
        .expect(403);
      await new Promise((r) => setTimeout(r, 3_100));
      await request(app)
        .get('/api/agents/enrollment-check?since=yesterday')
        .set(as(admin))
        .expect(400);
    });
  });
});
