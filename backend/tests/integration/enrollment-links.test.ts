import { createHash } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { container } from '../../src/infrastructure/di/container.ts';
import TYPES from '../../src/domain/constants/types.ts';
import type { IEnrollmentLinkConfig } from '../../src/application/types/use-case/agent.types.ts';
import type { ISecretCipher } from '../../src/application/interfaces/services/secret-cipher.service.interface.ts';
import type { IEncryptedSecret } from '../../src/domain/types/email-settings.types.ts';
import { AesGcmSecretCipher } from '../../src/infrastructure/services/aes-gcm-secret-cipher.service.ts';
import { agentKeyAad } from '../../src/domain/policies/enrollment-link.policy.ts';
import { FakeAgentManager, makeAgent } from '../helpers/fake-agent-manager.ts';
import type { ISignedInUser } from '../helpers/users.ts';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

// Lets a test take the key away, as if ENROLL_KEY_SECRET were unset.
class SwitchableCipher implements ISecretCipher {
  enabled = true;
  private readonly _inner = new AesGcmSecretCipher(TEST_KEY, 'ENROLL_KEY_SECRET');
  get available(): boolean {
    return this.enabled;
  }
  encrypt(plaintext: string, aad: string): IEncryptedSecret {
    return this._inner.encrypt(plaintext, aad);
  }
  decrypt(secret: IEncryptedSecret, aad: string): string {
    return this._inner.decrypt(secret, aad);
  }
}

// Bound before the app is imported, so DI keeps these instead of the real ones.
const manager = new FakeAgentManager();
const cipher = new SwitchableCipher();
const linkConfig: IEnrollmentLinkConfig = { publicUrl: 'https://192.168.1.20:8443' };
container.bind(TYPES.AgentManager).toConstantValue(manager);
container.bind(TYPES.EnrollKeyCipher).toConstantValue(cipher);
container.bind(TYPES.EnrollmentLinkConfig).toConstantValue(linkConfig);

const { default: app } = (await import('../../src/app.ts')) as { default: Express };
const { AppDataSource } = await import('../../src/infrastructure/database/data-source.ts');
const { closeDatabase, recreateDatabase } = await import('../helpers/database.ts');
const { addActiveUser, setupFirstAdmin } = await import('../helpers/users.ts');

const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const LINK = /^https:\/\/192\.168\.1\.20:8443\/e\/([0-9a-f]{64})$/;

const create = (user: ISignedInUser, body: Record<string, unknown>) =>
  request(app).post('/api/agents/enrollment-links').set(as(user)).send(body);
const linux = { os: 'linux-deb', arch: 'arm64', group: 'default', agentName: 'web-01' };

interface IPendingRow {
  id: string;
  name: string;
  status: string;
  wazuh_agent_id: string;
  arch: string | null;
  agent_key_ciphertext: string;
  agent_key_iv: string;
  agent_key_auth_tag: string;
  key_version: number;
}

const pendingRows = () =>
  AppDataSource.query<IPendingRow[]>('SELECT * FROM pending_agents ORDER BY created_at');
const tokenRows = () =>
  AppDataSource.query<
    { pending_agent_id: string; token_hash: string; expires_at: Date; used_at: Date | null }[]
  >('SELECT * FROM enrollment_tokens');
const lastAudit = async () => {
  const [row] = await AppDataSource.query<
    { action: string; target_id: string; target_label: string; metadata: Record<string, unknown> }[]
  >(
    'SELECT action, target_id, target_label, metadata FROM audit_logs ORDER BY occurred_at DESC LIMIT 1',
  );
  return row;
};

describe('enrollment links API', () => {
  let admin: ISignedInUser;
  let admin2: ISignedInUser;
  let lister: ISignedInUser;
  let revoker: ISignedInUser;
  let t1: ISignedInUser;
  let t2: ISignedInUser;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    // Creating links is limited to 10 a minute per admin, so the tests spread the load.
    admin2 = await addActiveUser(app, admin, 'admin2@example.com', 'admin');
    lister = await addActiveUser(app, admin, 'lister@example.com', 'admin');
    revoker = await addActiveUser(app, admin, 'revoker@example.com', 'admin');
    t1 = await addActiveUser(app, admin, 't1@example.com', 't1_analyst');
    t2 = await addActiveUser(app, admin, 't2@example.com', 't2_analyst');
  });
  afterAll(closeDatabase);

  beforeEach(async () => {
    manager.reset();
    cipher.enabled = true;
    linkConfig.publicUrl = 'https://192.168.1.20:8443';
    await AppDataSource.query('DELETE FROM pending_agents');
  });

  describe('access', () => {
    it('requires sign-in', async () => {
      await request(app).get('/api/agents/enrollment-links').expect(401);
    });

    it.each(['t1', 't2'])('forbids %s on every enrollment-link endpoint', async (who) => {
      const user = who === 't1' ? t1 : t2;
      await create(user, linux).expect(403);
      await request(app).get('/api/agents/enrollment-links').set(as(user)).expect(403);
      await request(app)
        .delete('/api/agents/enrollment-links/00000000-0000-4000-8000-000000000000')
        .set(as(user))
        .expect(403);
      expect(manager.calls.filter((c) => c.method === 'registerAgent')).toHaveLength(0);
    });
  });

  describe('creating a link', () => {
    it('pre-registers the agent and returns the link once', async () => {
      const res = await create(admin, linux).expect(201);

      expect(res.headers['cache-control']).toBe('no-store');
      const token = LINK.exec(res.body.data.url)?.[1];
      expect(token).toBeDefined();
      expect(res.body.data).toMatchObject({
        name: 'web-01',
        group: 'default',
        os: 'linux-deb',
        arch: 'arm64',
        wazuhAgentId: '001',
      });
      const expiresIn = new Date(res.body.data.expiresAt).getTime() - Date.now();
      expect(expiresIn).toBeGreaterThan(24 * 3600_000 - 60_000);
      expect(expiresIn).toBeLessThanOrEqual(24 * 3600_000);

      expect(manager.registered.get('001')).toMatchObject({ name: 'web-01', group: 'default' });
    });

    it('stores the key encrypted and only the hash of the token', async () => {
      const res = await create(admin, linux).expect(201);
      const token = LINK.exec(res.body.data.url)?.[1] ?? '';
      const [row] = await pendingRows();
      const [link] = await tokenRows();
      const wazuhKey = manager.registered.get('001')?.key ?? '';

      expect(row).toMatchObject({ id: res.body.data.id, status: 'pending', wazuh_agent_id: '001' });
      expect(row?.agent_key_ciphertext).not.toContain(wazuhKey);
      const decrypted = cipher.decrypt(
        {
          ciphertext: row?.agent_key_ciphertext ?? '',
          iv: row?.agent_key_iv ?? '',
          authTag: row?.agent_key_auth_tag ?? '',
          keyVersion: row?.key_version ?? 0,
        },
        agentKeyAad(row?.id ?? ''),
      );
      expect(decrypted).toBe(wazuhKey);

      expect(link).toMatchObject({
        pending_agent_id: row?.id,
        token_hash: sha256(token),
        used_at: null,
      });
      const dump = JSON.stringify(await AppDataSource.query('SELECT * FROM enrollment_tokens'));
      expect(dump).not.toContain(token);
    });

    it('binds the key to its row, so it does not decrypt under another id', async () => {
      await create(admin, linux).expect(201);
      const [row] = await pendingRows();
      const secret = {
        ciphertext: row?.agent_key_ciphertext ?? '',
        iv: row?.agent_key_iv ?? '',
        authTag: row?.agent_key_auth_tag ?? '',
        keyVersion: row?.key_version ?? 0,
      };
      expect(() =>
        cipher.decrypt(secret, agentKeyAad('00000000-0000-4000-8000-000000000000')),
      ).toThrow();
    });

    it('records the link in the audit log without the token, link or key', async () => {
      const res = await create(admin, linux).expect(201);
      const token = LINK.exec(res.body.data.url)?.[1] ?? '';
      const audit = await lastAudit();

      expect(audit).toMatchObject({
        action: 'agent.enrollment_link.created',
        target_id: '001',
        target_label: 'web-01',
      });
      expect(audit?.metadata).toMatchObject({ os: 'linux-deb', arch: 'arm64', group: 'default' });
      const dump = JSON.stringify(audit);
      expect(dump).not.toContain(token);
      expect(dump).not.toContain(manager.registered.get('001')?.key ?? 'missing');
    });

    it('has no architecture for Windows', async () => {
      const res = await create(admin, { ...linux, os: 'windows', agentName: 'desk-01' }).expect(
        201,
      );
      expect(res.body.data.arch).toBeNull();
    });

    it('refuses a name that already has a pending link, before asking Wazuh', async () => {
      await create(admin, linux).expect(201);
      manager.calls = [];

      const res = await create(admin, linux).expect(409);
      expect(res.body.message).toMatch(/still pending/);
      expect(manager.calls.some((c) => c.method === 'registerAgent')).toBe(false);
    });

    it('refuses a name Wazuh already has', async () => {
      manager.agents = [makeAgent({ name: 'web-01' })];
      const res = await create(admin2, linux).expect(409);
      expect(res.body.message).toMatch(/already registered/);
      expect(await pendingRows()).toHaveLength(0);
    });

    it('refuses a group Wazuh does not have, before registering', async () => {
      await create(admin2, { ...linux, group: 'nope' }).expect(400);
      expect(manager.calls.some((c) => c.method === 'registerAgent')).toBe(false);
    });

    it('needs a name', async () => {
      await create(admin2, { os: 'windows', group: 'default' }).expect(400);
    });

    it('removes the agent from Wazuh again when assigning the group fails', async () => {
      manager.failAssign = true;
      await create(admin2, linux).expect(503);
      expect(manager.calls.map((c) => c.method)).toContain('removeAgent');
      expect(manager.registered.size).toBe(0);
      expect(await pendingRows()).toHaveLength(0);
    });

    it('removes the agent from Wazuh again when saving fails', async () => {
      // A leftover row already holds Wazuh id 001, so the insert hits the unique index.
      await AppDataSource.query(
        `INSERT INTO pending_agents (name, group_name, os, wazuh_agent_id, agent_key_ciphertext,
           agent_key_iv, agent_key_auth_tag, key_version, status)
         VALUES ('old', 'default', 'windows', '001', 'a', 'b', 'c', 1, 'connected')`,
      );
      // The error handler answers a unique violation with 409; what matters is the rollback.
      await create(admin2, linux).expect(409);
      expect(manager.calls.map((c) => c.method)).toContain('removeAgent');
      expect(manager.registered.size).toBe(0);
      expect(await tokenRows()).toHaveLength(0);
    });

    it('says what is missing when there is no address for the link', async () => {
      linkConfig.publicUrl = undefined;
      const res = await create(admin2, linux).expect(409);
      expect(res.body.message).toMatch(/WAZUH_PUBLIC_ADDRESS/);
      expect(manager.calls).toHaveLength(0);
    });

    it('says what is missing when there is no ENROLL_KEY_SECRET', async () => {
      cipher.enabled = false;
      const res = await create(admin2, linux).expect(409);
      expect(res.body.message).toMatch(/ENROLL_KEY_SECRET/);
      expect(manager.calls).toHaveLength(0);
    });

    it('answers 503 when Wazuh is down, and saves nothing', async () => {
      manager.down = true;
      await create(admin2, linux).expect(503);
      expect(await pendingRows()).toHaveLength(0);
    });
  });

  describe('listing pending links', () => {
    it('lists pending agents without any secret', async () => {
      await create(lister, linux).expect(201);
      await create(lister, { ...linux, os: 'windows', agentName: 'desk-01' }).expect(201);

      const res = await request(app)
        .get('/api/agents/enrollment-links')
        .set(as(lister))
        .expect(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body.data.map((l: { name: string }) => l.name)).toEqual(['desk-01', 'web-01']);
      expect(Object.keys(res.body.data[0]).sort()).toEqual([
        'arch',
        'createdAt',
        'expiresAt',
        'group',
        'id',
        'name',
        'os',
        'scriptDownloadedAt',
        'status',
        'wazuhAgentId',
      ]);
    });

    it('shows when the script was downloaded, and leaves out connected agents', async () => {
      await create(lister, linux).expect(201);
      await create(lister, { ...linux, agentName: 'web-02' }).expect(201);
      await AppDataSource.query(
        `UPDATE enrollment_tokens SET used_at = now()
           WHERE pending_agent_id = (SELECT id FROM pending_agents WHERE name = 'web-01')`,
      );
      await AppDataSource.query(
        `UPDATE pending_agents SET status = 'connected' WHERE name = 'web-02'`,
      );

      const res = await request(app)
        .get('/api/agents/enrollment-links')
        .set(as(lister))
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ name: 'web-01', status: 'pending' });
      expect(res.body.data[0].scriptDownloadedAt).not.toBeNull();
    });
  });

  describe('revoking a link', () => {
    const revoke = (id: string) =>
      request(app).delete(`/api/agents/enrollment-links/${id}`).set(as(revoker));

    it('removes the agent from Wazuh and deletes it with its link', async () => {
      const { body } = await create(revoker, linux).expect(201);

      await revoke(body.data.id).expect(200);

      expect(manager.registered.has('001')).toBe(false);
      expect(await pendingRows()).toHaveLength(0);
      expect(await tokenRows()).toHaveLength(0);
      expect(await lastAudit()).toMatchObject({
        action: 'agent.enrollment_link.revoked',
        target_id: '001',
        target_label: 'web-01',
      });
    });

    it('still succeeds when Wazuh no longer has the agent', async () => {
      const { body } = await create(revoker, linux).expect(201);
      manager.registered.clear();
      await revoke(body.data.id).expect(200);
      expect(await pendingRows()).toHaveLength(0);
    });

    it('refuses an agent that has already connected, without touching Wazuh', async () => {
      const { body } = await create(revoker, linux).expect(201);
      await AppDataSource.query(`UPDATE pending_agents SET status = 'connected'`);
      manager.calls = [];

      await revoke(body.data.id).expect(409);
      expect(manager.calls.some((c) => c.method === 'removeAgent')).toBe(false);
      expect(await pendingRows()).toHaveLength(1);
    });

    it('keeps the link when Wazuh is down, so it can be revoked later', async () => {
      const { body } = await create(revoker, linux).expect(201);
      manager.failRemove = true;

      await revoke(body.data.id).expect(503);
      expect(await pendingRows()).toHaveLength(1);
      expect(await tokenRows()).toHaveLength(1);
    });

    it('answers 404 for a link that does not exist, and 400 for a malformed id', async () => {
      await revoke('00000000-0000-4000-8000-000000000000').expect(404);
      await revoke('not-a-uuid').expect(400);
    });
  });
});
