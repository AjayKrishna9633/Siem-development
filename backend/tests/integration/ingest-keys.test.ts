import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { di } from '../../src/infrastructure/di/index.ts';
import { MAX_ACTIVE_INGEST_KEYS } from '../../src/domain/constants/ingest.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { addActiveUser, setupFirstAdmin, type ISignedInUser } from '../helpers/users.ts';

describe('ingest keys', () => {
  let admin: ISignedInUser;
  let analyst: ISignedInUser;
  const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });
  const create = (name: string, user = admin) =>
    request(app).post('/api/ingest-keys').set(as(user)).send({ name });

  const auditRows = (action: string) =>
    AppDataSource.query<
      { actor_username: string; target_label: string; target_id: string; metadata: unknown }[]
    >(
      'SELECT actor_username, target_label, target_id, metadata FROM audit_logs WHERE action = $1 ORDER BY occurred_at',
      [action],
    );

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    analyst = await addActiveUser(app, admin, 't2@example.com', 't2_analyst');
  });
  afterAll(closeDatabase);

  it('creates a key, returns it once, and stores only its hash and prefix', async () => {
    const res = await create('  Billing-API  ');

    expect(res.status).toBe(201);
    expect(res.headers['cache-control']).toBe('no-store');
    const { key, secret } = res.body.data;
    expect(secret).toMatch(/^siemple_ik_[0-9a-f]{64}$/);
    expect(key).toMatchObject({
      name: 'billing-api',
      keyPrefix: secret.slice(0, 16),
      createdBy: admin.id,
      lastUsedAt: null,
      revokedAt: null,
      active: true,
    });

    const [row] = await AppDataSource.query<{ key_hash: string; key_prefix: string }[]>(
      'SELECT key_hash, key_prefix FROM ingest_keys WHERE id = $1',
      [key.id],
    );
    expect(row?.key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row?.key_hash).not.toContain(secret.slice(11));
    expect(JSON.stringify(row)).not.toContain(secret);
  });

  it('never shows the key again in the list', async () => {
    const res = await request(app).get('/api/ingest-keys').set(as(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.map((k: { name: string }) => k.name)).toContain('billing-api');
    expect(JSON.stringify(res.body)).not.toMatch(/siemple_ik_[0-9a-f]{64}|secret|key_?hash/i);
  });

  it('audits the creation without the key', async () => {
    const [row] = await auditRows('ingest.key.create');

    expect(row).toMatchObject({ actor_username: 'First Admin', target_label: 'billing-api' });
    expect(row?.metadata).toMatchObject({ name: 'billing-api' });
    expect(JSON.stringify(row)).not.toMatch(/siemple_ik_[0-9a-f]{64}/);
  });

  it.each([
    ['empty', ''],
    ['spaces inside', 'billing api'],
    ['leading dash', '-billing'],
    ['too long', 'a'.repeat(65)],
    ['a quote', 'bill"ing'],
  ])('refuses a name with %s', async (_label, name) => {
    const res = await create(name);
    expect(res.status).toBe(400);
  });

  it('refuses a second active key with the same name', async () => {
    const res = await create('BILLING-API');

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INGEST_KEY_NAME_TAKEN');
  });

  it('revokes a key once; a revoked name can be used again', async () => {
    const created = await create('firewall');
    const id = created.body.data.key.id;

    const revoked = await request(app).delete(`/api/ingest-keys/${id}`).set(as(admin));
    expect(revoked.status).toBe(200);
    expect(revoked.body.data).toMatchObject({ active: false, revokedBy: admin.id });
    expect(revoked.body.data.revokedAt).not.toBeNull();

    const again = await request(app).delete(`/api/ingest-keys/${id}`).set(as(admin));
    expect(again.status).toBe(404);
    expect(again.body.code).toBe('INGEST_KEY_NOT_FOUND');

    expect((await create('firewall')).status).toBe(201);

    const [row] = await auditRows('ingest.key.revoke');
    expect(row).toMatchObject({ target_id: id, target_label: 'firewall' });
  });

  it('answers 404 for an unknown key and 400 for an id that is not a UUID', async () => {
    const unknown = await request(app)
      .delete('/api/ingest-keys/00000000-0000-4000-8000-000000000000')
      .set(as(admin));
    expect(unknown.status).toBe(404);

    const malformed = await request(app).delete('/api/ingest-keys/not-a-uuid').set(as(admin));
    expect(malformed.status).toBe(400);
  });

  it('is admin only', async () => {
    expect((await request(app).get('/api/ingest-keys')).status).toBe(401);
    expect((await request(app).get('/api/ingest-keys').set(as(analyst))).status).toBe(403);
    expect((await create('sneaky', analyst)).status).toBe(403);

    const count = await AppDataSource.query<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM ingest_keys WHERE name = 'sneaky'`,
    );
    expect(count[0]?.n).toBe(0);
  });

  it('works from the server command, audited as the system', async () => {
    const { key, secret } = await di.ingestKeys.create.execute({ actor: null, name: 'cli-made' });
    expect(secret).toMatch(/^siemple_ik_/);
    expect(key.createdBy).toBeNull();

    const revoked = await di.ingestKeys.revoke.execute({ actor: null, id: key.id });
    expect(revoked.active).toBe(false);

    const rows = await AppDataSource.query<{ actor_username: string; metadata: unknown }[]>(
      `SELECT actor_username, metadata FROM audit_logs WHERE target_label = 'cli-made' ORDER BY occurred_at`,
    );
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.actor_username).toBe('system');
      expect(row.metadata).toMatchObject({ via: 'cli' });
    }
  });

  it(`stops at ${MAX_ACTIVE_INGEST_KEYS} active keys`, async () => {
    const active = await di.ingestKeys.list.execute({ actor: null });
    const missing = MAX_ACTIVE_INGEST_KEYS - active.filter((k) => k.active).length;
    await AppDataSource.query(
      `INSERT INTO ingest_keys (name, key_prefix, key_hash)
       SELECT 'filler-' || i, 'siemple_ik_0000', md5(i::text) || md5('x' || i)
       FROM generate_series(1, $1) AS i`,
      [missing],
    );

    const res = await create('one-too-many');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INGEST_KEY_LIMIT_REACHED');
  });
});
