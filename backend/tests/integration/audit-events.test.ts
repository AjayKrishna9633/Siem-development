import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { addActiveUser, PASSWORD, setupFirstAdmin, type ISignedInUser } from '../helpers/users.ts';

const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });

interface IAuditRow {
  action: string;
  category: string;
  outcome: string;
  actor_id: string | null;
  actor_username: string | null;
  actor_role: string | null;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  ip_address: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
}

const rows = (action: string) =>
  AppDataSource.query<IAuditRow[]>(
    'SELECT * FROM audit_logs WHERE action = $1 ORDER BY occurred_at, id',
    [action],
  );

describe('audit coverage of the events the product records', () => {
  let admin: ISignedInUser;
  let analyst: ISignedInUser;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    analyst = await addActiveUser(app, admin, 'tier1@example.com', 't1_analyst');
  });
  afterAll(closeDatabase);

  it('records the setup token being used and setup completing, as the admin it created', async () => {
    const [used] = await rows('auth.setup_token.used');
    const [completed] = await rows('system.setup.completed');

    expect(used).toMatchObject({
      category: 'auth',
      outcome: 'success',
      actor_id: admin.id,
      actor_username: 'First Admin',
      target_type: 'system_settings',
    });
    expect(completed).toMatchObject({
      category: 'system',
      actor_id: admin.id,
      target_label: 'admin@example.com',
    });
  });

  it('names the user on a successful sign-in, with address and request id', async () => {
    await request(app)
      .post('/api/auth/login')
      .set('X-Request-Id', 'req-login-ok')
      .send({ email: 'admin@example.com', password: PASSWORD })
      .expect(200);

    const row = (await rows('auth.login.success')).find((r) => r.request_id === 'req-login-ok');

    expect(row).toMatchObject({
      category: 'auth',
      outcome: 'success',
      actor_id: admin.id,
      actor_username: 'First Admin',
      actor_role: 'admin',
      target_label: 'admin@example.com',
    });
    expect(row?.ip_address).toBeTruthy();
  });

  it('records a failed sign-in with no actor and the reason', async () => {
    await request(app)
      .post('/api/auth/login')
      .set('X-Request-Id', 'req-login-bad')
      .send({ email: 'nobody@example.com', password: 'whatever-it-is-123' })
      .expect(401);

    const row = (await rows('auth.login.failure')).find((r) => r.request_id === 'req-login-bad');

    expect(row).toMatchObject({
      outcome: 'failure',
      actor_id: null,
      actor_username: null,
      metadata: { email: 'nobody@example.com', reason: 'unknown_account' },
    });
  });

  it('records a lockout once, on the attempt that causes it', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'tier1@example.com', password: 'definitely-wrong-123' })
        .expect(401);
    }

    const locked = await rows('auth.account.locked');
    expect(locked).toHaveLength(1);
    expect(locked[0]).toMatchObject({
      category: 'auth',
      outcome: 'failure',
      target_id: analyst.id,
      target_label: 'tier1@example.com',
      actor_id: null,
    });
  });

  it('records a refused permission as denied, against the signed-in user', async () => {
    await request(app)
      .get('/api/users')
      .set(as(analyst))
      .set('X-Request-Id', 'req-denied-1')
      .expect(403);

    const row = (await rows('access.denied')).find((r) => r.request_id === 'req-denied-1');

    expect(row).toMatchObject({
      category: 'auth',
      outcome: 'denied',
      actor_id: analyst.id,
      actor_role: 't1_analyst',
      metadata: { method: 'GET', path: '/api/users', code: 'FORBIDDEN' },
    });
  });

  it('also records an admin refused for changing their own access', async () => {
    await request(app)
      .patch(`/api/users/${admin.id}/role`)
      .set(as(admin))
      .send({ role: 't1_analyst' })
      .expect(403);

    const row = (await rows('access.denied')).find(
      (r) => r.metadata.code === 'CANNOT_CHANGE_OWN_ACCESS',
    );
    expect(row).toMatchObject({ actor_id: admin.id, outcome: 'denied' });
  });

  it('does not record requests that were never authenticated, or a query string', async () => {
    const before = (await rows('access.denied')).length;

    await request(app).get('/api/users').expect(401);
    await request(app).get('/api/users?search=secret-token').set(as(analyst)).expect(403);

    const after = await rows('access.denied');
    expect(after).toHaveLength(before + 1);
    expect(JSON.stringify(after.at(-1)?.metadata)).not.toContain('secret-token');
  });

  it('records who signed out when the refresh cookie is used', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: PASSWORD })
      .expect(200);
    const cookie = (login.headers['set-cookie'] as unknown as string[]).map(
      (c) => c.split(';')[0] ?? '',
    );

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200);

    const [row] = await rows('auth.logout');
    expect(row).toMatchObject({
      category: 'auth',
      actor_id: admin.id,
      actor_username: 'First Admin',
      target_id: admin.id,
    });
  });

  it('records a profile change with before and after, and nothing for a no-op', async () => {
    await request(app)
      .put('/api/auth/profile')
      .set(as(admin))
      .send({ username: 'Ada Admin' })
      .expect(200);
    await request(app)
      .put('/api/auth/profile')
      .set(as(admin))
      .send({ username: 'Ada Admin' })
      .expect(200);

    const updates = await rows('user.update');
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      category: 'user',
      actor_id: admin.id,
      target_id: admin.id,
      metadata: { before: { username: 'First Admin' }, after: { username: 'Ada Admin' } },
    });
  });
});
