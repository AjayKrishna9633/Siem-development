import { createHash } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { container } from '../../src/infrastructure/di/container.ts';
import TYPES from '../../src/domain/constants/types.ts';
import type { IEnrollmentLinkConfig } from '../../src/application/types/use-case/agent.types.ts';
import type { IClock } from '../../src/application/interfaces/services/clock.interface.ts';
import { AesGcmSecretCipher } from '../../src/infrastructure/services/aes-gcm-secret-cipher.service.ts';
import { agentKeyAad } from '../../src/domain/policies/enrollment-link.policy.ts';
import { FakeAgentManager } from '../helpers/fake-agent-manager.ts';
import type { ISignedInUser } from '../helpers/users.ts';

const cipher = new AesGcmSecretCipher(Buffer.alloc(32, 7).toString('base64'), 'ENROLL_KEY_SECRET');
const manager = new FakeAgentManager();
const clock: IClock & { current: Date } = {
  current: new Date(),
  now() {
    return new Date(this.current);
  },
};
const linkConfig: IEnrollmentLinkConfig = {
  publicUrl: 'https://192.168.1.20:8443',
  managerAddress: '192.168.1.20',
  fallbackAgentVersion: '4.14.10',
};
container.bind(TYPES.AgentManager).toConstantValue(manager);
container.bind(TYPES.EnrollKeyCipher).toConstantValue(cipher);
container.bind(TYPES.EnrollmentLinkConfig).toConstantValue(linkConfig);
container.bind(TYPES.Clock).toConstantValue(clock);

const { default: app } = (await import('../../src/app.ts')) as { default: Express };
const { AppDataSource } = await import('../../src/infrastructure/database/data-source.ts');
const { closeDatabase, recreateDatabase } = await import('../helpers/database.ts');
const { addActiveUser, setupFirstAdmin } = await import('../helpers/users.ts');

const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const TOKEN = /\/e\/([0-9a-f]{64})$/;
const HOUR = 3_600_000;

interface IRow {
  id: string;
  name: string;
  group_name: string;
  os: string;
  arch: string | null;
  status: string;
  wazuh_agent_id: string;
  agent_key_ciphertext: string;
  agent_key_iv: string;
  agent_key_auth_tag: string;
  key_version: number;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
}

const rows = () =>
  AppDataSource.query<IRow[]>(
    `SELECT a.*, t.token_hash, t.expires_at, t.used_at
       FROM pending_agents a JOIN enrollment_tokens t ON t.pending_agent_id = a.id
      ORDER BY a.created_at`,
  );

let testStartedAt = new Date(0);
const audits = () =>
  AppDataSource.query<
    { target_id: string; target_label: string; metadata: Record<string, unknown> }[]
  >(
    `SELECT target_id, target_label, metadata FROM audit_logs
      WHERE action = 'agent.enrollment_link.reissued' AND occurred_at >= $1 ORDER BY occurred_at`,
    [testStartedAt],
  );

const decryptKey = (row: IRow) =>
  cipher.decrypt(
    {
      ciphertext: row.agent_key_ciphertext,
      iv: row.agent_key_iv,
      authTag: row.agent_key_auth_tag,
      keyVersion: row.key_version,
    },
    agentKeyAad(row.id),
  );

describe('reissuing an enrollment link', () => {
  let admins: ISignedInUser[];
  let next = 0;
  let t1: ISignedInUser;
  // Creating and reissuing share one limit of 10 a minute per admin; the tests take turns.
  const admin = () => admins[next++ % admins.length] as ISignedInUser;

  const create = async (user: ISignedInUser, agentName = 'web-01') => {
    const res = await request(app)
      .post('/api/agents/enrollment-links')
      .set(as(user))
      .send({ os: 'linux-rpm', arch: 'arm64', group: 'windows-servers', agentName })
      .expect(201);
    return res.body.data as { id: string; url: string; wazuhAgentId: string };
  };
  const reissue = (user: ISignedInUser, id: string) =>
    request(app).post(`/api/agents/enrollment-links/${id}/reissue`).set(as(user));

  beforeAll(async () => {
    await recreateDatabase();
    const first = await setupFirstAdmin(app);
    admins = [first];
    for (const n of [2, 3, 4, 5]) {
      admins.push(await addActiveUser(app, first, `admin${n}@example.com`, 'admin'));
    }
    t1 = await addActiveUser(app, first, 't1@example.com', 't1_analyst');
  });
  afterAll(closeDatabase);

  beforeEach(async () => {
    manager.reset();
    clock.current = new Date();
    await AppDataSource.query('DELETE FROM pending_agents');
    const [now] = await AppDataSource.query<{ t: Date }[]>('SELECT clock_timestamp() AS t');
    testStartedAt = now?.t ?? new Date();
  });

  describe('before the script was downloaded', () => {
    it('gives the same agent a new token and expiry, and leaves Wazuh alone', async () => {
      const user = admin();
      const original = await create(user);
      const [before] = await rows();
      manager.calls = [];
      clock.current = new Date(clock.current.getTime() + 2 * HOUR);

      const res = await reissue(user, original.id).expect(201);

      expect(res.headers['cache-control']).toBe('no-store');
      const token = TOKEN.exec(res.body.data.url)?.[1] ?? '';
      expect(res.body.data).toMatchObject({ id: original.id, wazuhAgentId: original.wazuhAgentId });
      const [after] = await rows();
      expect(after?.id).toBe(before?.id);
      expect(after?.wazuh_agent_id).toBe(before?.wazuh_agent_id);
      expect(after?.token_hash).toBe(sha256(token));
      expect(after?.token_hash).not.toBe(before?.token_hash);
      expect(after?.expires_at.getTime()).toBe(clock.current.getTime() + 24 * HOUR);
      expect(after?.used_at).toBeNull();
      // Same key as before: nothing changed in Wazuh.
      expect(decryptKey(after as IRow)).toBe(decryptKey(before as IRow));
      expect(manager.calls.filter((c) => c.method !== 'listGroups')).toEqual([]);

      const [audit] = await audits();
      expect(audit).toMatchObject({ target_id: original.wazuhAgentId, target_label: 'web-01' });
      expect(audit?.metadata).toMatchObject({ kind: 'new_link' });
      expect(JSON.stringify(audit)).not.toContain(token);
    });

    it('makes the old link stop working', async () => {
      const user = admin();
      const original = await create(user);
      const oldHash = sha256(TOKEN.exec(original.url)?.[1] ?? '');
      await reissue(user, original.id).expect(201);
      const [count] = await AppDataSource.query<{ n: number }[]>(
        'SELECT count(*)::int AS n FROM enrollment_tokens WHERE token_hash = $1',
        [oldHash],
      );
      expect(count?.n).toBe(0);
    });
  });

  describe('after the script was downloaded', () => {
    const download = (id: string) =>
      AppDataSource.query(
        'UPDATE enrollment_tokens SET used_at = now() WHERE pending_agent_id = $1',
        [id],
      );

    it('removes the old agent from Wazuh and creates a fresh one with the same details', async () => {
      const user = admin();
      const original = await create(user);
      await download(original.id);
      manager.calls = [];

      const res = await reissue(user, original.id).expect(201);

      const token = TOKEN.exec(res.body.data.url)?.[1] ?? '';
      expect(res.body.data.id).not.toBe(original.id);
      expect(res.body.data.wazuhAgentId).not.toBe(original.wazuhAgentId);
      expect(manager.calls.map((c) => c.method)).toEqual(
        expect.arrayContaining(['removeAgent', 'registerAgent', 'assignGroup']),
      );
      expect(manager.registered.has(original.wazuhAgentId)).toBe(false);
      expect(manager.registered.get(res.body.data.wazuhAgentId)).toMatchObject({
        name: 'web-01',
        group: 'windows-servers',
      });

      const all = await rows();
      expect(all).toHaveLength(1);
      expect(all[0]).toMatchObject({
        id: res.body.data.id,
        name: 'web-01',
        group_name: 'windows-servers',
        os: 'linux-rpm',
        arch: 'arm64',
        status: 'pending',
        token_hash: sha256(token),
        used_at: null,
      });
      expect(decryptKey(all[0] as IRow)).toBe(
        manager.registered.get(res.body.data.wazuhAgentId)?.key,
      );

      const [audit] = await audits();
      expect(audit?.metadata).toMatchObject({
        kind: 'new_agent',
        previousWazuhAgentId: original.wazuhAgentId,
        reason: 'script_downloaded',
      });
    });

    it('also replaces a link the sync job already expired', async () => {
      const user = admin();
      const original = await create(user);
      await AppDataSource.query(`UPDATE pending_agents SET status = 'expired' WHERE id = $1`, [
        original.id,
      ]);
      manager.registered.delete(original.wazuhAgentId);

      const res = await reissue(user, original.id).expect(201);
      expect(res.body.data.wazuhAgentId).not.toBe(original.wazuhAgentId);
      expect((await rows())[0]?.status).toBe('pending');
      expect((await audits())[0]?.metadata).toMatchObject({ reason: 'expired' });
    });

    it('rolls everything back when assigning the group fails, removing the new agent', async () => {
      const user = admin();
      const original = await create(user);
      await download(original.id);
      manager.failAssign = true;
      manager.calls = [];

      await reissue(user, original.id).expect(503);

      const registeredIds = manager.calls
        .filter((c) => c.method === 'removeAgent')
        .map((c) => c.wazuhId);
      // The old one (removed first) and the new one (the rollback).
      expect(registeredIds).toHaveLength(2);
      expect(manager.registered.size).toBe(0);
      // SIEMple's side is unchanged: the old row is back, still downloaded.
      const all = await rows();
      expect(all).toHaveLength(1);
      expect(all[0]).toMatchObject({ id: original.id, wazuh_agent_id: original.wazuhAgentId });
      expect(all[0]?.used_at).not.toBeNull();
      expect(await audits()).toHaveLength(0);
    });

    it('rolls back when saving fails, removing the new agent', async () => {
      const user = admin();
      const original = await create(user);
      await download(original.id);
      // A leftover row holds the next Wazuh id, so the insert hits the unique index.
      await AppDataSource.query(
        `INSERT INTO pending_agents (name, group_name, os, wazuh_agent_id, agent_version,
           agent_key_ciphertext, agent_key_iv, agent_key_auth_tag, key_version, status)
         VALUES ('old', 'default', 'windows', $1, '4.14.10', 'a', 'b', 'c', 1, 'connected')`,
        [String(manager.nextId).padStart(3, '0')],
      );

      await reissue(user, original.id).expect(409);

      expect(manager.registered.size).toBe(0);
      const mine = (await rows()).filter((r) => r.name === 'web-01');
      expect(mine).toHaveLength(1);
      expect(mine[0]?.id).toBe(original.id);
      expect(await audits()).toHaveLength(0);
    });

    it('changes nothing when Wazuh cannot remove the old agent', async () => {
      const user = admin();
      const original = await create(user);
      await download(original.id);
      manager.failRemove = true;
      manager.calls = [];

      await reissue(user, original.id).expect(503);

      expect(manager.calls.some((c) => c.method === 'registerAgent')).toBe(false);
      expect(manager.registered.has(original.wazuhAgentId)).toBe(true);
      const all = await rows();
      expect(all[0]?.id).toBe(original.id);
      expect(await audits()).toHaveLength(0);
    });
  });

  it('refuses an agent that already connected, without touching anything', async () => {
    const user = admin();
    const original = await create(user);
    await AppDataSource.query(`UPDATE pending_agents SET status = 'connected' WHERE id = $1`, [
      original.id,
    ]);
    const [before] = await rows();
    manager.calls = [];

    const res = await reissue(user, original.id).expect(409);

    expect(res.body.message).toMatch(/already connected/);
    expect(manager.calls).toEqual([]);
    expect((await rows())[0]).toEqual(before);
  });

  it('answers 404 for an unknown link and 403 for an analyst', async () => {
    await reissue(admin(), '00000000-0000-4000-8000-000000000000').expect(404);
    const original = await create(admin());
    await reissue(t1, original.id).expect(403);
  });
});
