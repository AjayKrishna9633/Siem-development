import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import { auditActions, closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { addActiveUser, setupFirstAdmin, type ISignedInUser } from '../helpers/users.ts';

const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });

describe('roles, permissions and account status', () => {
  let admin: ISignedInUser;
  let otherAdmin: ISignedInUser;
  let analyst: ISignedInUser;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    otherAdmin = await addActiveUser(app, admin, 'second@example.com', 'admin');
    analyst = await addActiveUser(app, admin, 'tier1@example.com', 't1_analyst');
  });
  afterAll(closeDatabase);

  it('keeps users.manage routes away from analysts', async () => {
    const res = await request(app).get('/api/users').set(as(analyst));
    expect(res.status).toBe(403);
  });

  it("refuses an admin's change to their own role or status", async () => {
    const role = await request(app)
      .patch(`/api/users/${admin.id}/role`)
      .set(as(admin))
      .send({ role: 't1_analyst' });
    const disable = await request(app).post(`/api/users/${admin.id}/disable`).set(as(admin));

    expect(role.status).toBe(403);
    expect(role.body.code).toBe('CANNOT_CHANGE_OWN_ACCESS');
    expect(disable.status).toBe(403);
  });

  it("applies a role change to the user's existing token on their next request", async () => {
    await request(app)
      .patch(`/api/users/${analyst.id}/role`)
      .set(as(admin))
      .send({ role: 'admin' })
      .expect(200);
    await request(app).get('/api/users').set(as(analyst)).expect(200);

    await request(app)
      .patch(`/api/users/${analyst.id}/role`)
      .set(as(admin))
      .send({ role: 't1_analyst' })
      .expect(200);
    await request(app).get('/api/users').set(as(analyst)).expect(403);
  });

  it('cuts a disabled user off immediately, and enabling restores sign-in', async () => {
    await request(app).post(`/api/users/${analyst.id}/disable`).set(as(admin)).expect(200);

    const me = await request(app).get('/api/auth/me').set(as(analyst));
    expect(me.status).toBe(401);
    expect(me.body.code).toBe('SESSION_REVOKED');

    await request(app).post(`/api/users/${analyst.id}/enable`).set(as(admin)).expect(200);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tier1@example.com', password: 'correct-horse-battery' });
    expect(login.status).toBe(200);
  });

  it('never leaves zero admins when two admins demote each other at once', async () => {
    const [first, second] = await Promise.all([
      request(app)
        .patch(`/api/users/${otherAdmin.id}/role`)
        .set(as(admin))
        .send({ role: 't2_analyst' }),
      request(app)
        .patch(`/api/users/${admin.id}/role`)
        .set(as(otherAdmin))
        .send({ role: 't2_analyst' }),
    ]);

    // Whichever request loses is refused by one of two safeguards, depending on timing:
    // 403 if the winner had already committed when the loser was authenticated (the role
    // is re-read on every request), or 409 LAST_ADMIN if both got past authentication and
    // the advisory lock decided. admin-race.test.ts pins down the lock path on its own.
    const loser = first.status === 200 ? second : first;
    expect([first.status, second.status]).toContain(200);
    expect([403, 409]).toContain(loser.status);

    const remainingAdmin = first.status === 200 ? admin : otherAdmin;
    const users = await request(app).get('/api/users').set(as(remainingAdmin));
    const activeAdmins = users.body.data.filter(
      (u: { role: string; status: string }) => u.role === 'admin' && u.status === 'active',
    );
    expect(activeAdmins).toHaveLength(1);
  });

  it('records every role and status change in the audit log', async () => {
    const actions = await auditActions();
    expect(actions).toEqual(
      expect.arrayContaining(['user.role_changed', 'user.disabled', 'user.enabled']),
    );
  });
});
