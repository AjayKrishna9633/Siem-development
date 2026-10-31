import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import { di } from '../../src/infrastructure/di/index.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { auditActions, closeDatabase, recreateDatabase } from '../helpers/database.ts';
import {
  PASSWORD,
  addActiveUser,
  setupFirstAdmin,
  tokenFromLink,
  type ISignedInUser,
} from '../helpers/users.ts';

const login = (email: string, password: string) =>
  request(app).post('/api/auth/login').send({ email, password });

describe('passwords: change, reset links and recovery', () => {
  let admin: ISignedInUser;
  let analyst: ISignedInUser;
  const asAdmin = () => ({ Authorization: `Bearer ${admin.token}` });

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    analyst = await addActiveUser(app, admin, 'ana@example.com', 't1_analyst');
  });
  afterAll(closeDatabase);

  it('changes a password with the current password alone, signing out other sessions', async () => {
    const wrong = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ currentPassword: 'not-my-password', newPassword: 'changed-passphrase' });
    expect(wrong.status).toBe(400);

    const changed = await request(app)
      .post('/api/auth/password')
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'changed-passphrase' });
    expect(changed.status).toBe(200);

    const oldSession = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${analyst.token}`);
    expect(oldSession.status).toBe(401);
    analyst = { ...analyst, token: changed.body.data.accessToken };
  });

  it('lets an admin issue a reset link that works exactly once', async () => {
    const issued = await request(app)
      .post(`/api/users/${analyst.id}/password-reset`)
      .set(asAdmin());
    expect(issued.status).toBe(200);
    expect(issued.body.data.delivered).toBe(false);
    const token = tokenFromLink(issued.body.data.link);

    const [first, second] = await Promise.all([
      request(app).post('/api/auth/password-reset').send({ token, password: 'reset-passphrase-a' }),
      request(app).post('/api/auth/password-reset').send({ token, password: 'reset-passphrase-b' }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 400]);

    const winner = first.status === 200 ? 'reset-passphrase-a' : 'reset-passphrase-b';
    expect((await login('ana@example.com', winner)).status).toBe(200);
    expect((await login('ana@example.com', 'changed-passphrase')).status).toBe(401);

    // The reset signed out the session the analyst had before
    const before = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${analyst.token}`);
    expect(before.status).toBe(401);
  });

  it('rejects an expired reset link', async () => {
    const issued = await request(app)
      .post(`/api/users/${analyst.id}/password-reset`)
      .set(asAdmin());
    await AppDataSource.query(
      `UPDATE auth_tokens SET expires_at = now() - interval '1 minute' WHERE type = 'reset' AND used_at IS NULL`,
    );
    const res = await request(app)
      .get('/api/auth/password-reset')
      .query({ token: tokenFromLink(issued.body.data.link) });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_RESET_LINK');
  });

  it('answers "forgot password" the same for known and unknown emails', async () => {
    const known = await request(app)
      .post('/api/auth/password-reset/request')
      .send({ email: 'ana@example.com' });
    const unknown = await request(app)
      .post('/api/auth/password-reset/request')
      .send({ email: 'ghost@example.com' });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
  });

  it('gives a working recovery link to an admin locked out, and refuses non-admins', async () => {
    await expect(di.createRecoveryLink.execute({ email: 'ana@example.com' })).rejects.toMatchObject(
      {
        code: 'USER_NOT_FOUND',
      },
    );

    const { link } = await di.createRecoveryLink.execute({ email: 'admin@example.com' });
    await request(app)
      .post('/api/auth/password-reset')
      .send({ token: tokenFromLink(link), password: 'recovered-admin-pass' })
      .expect(200);
    expect((await login('admin@example.com', 'recovered-admin-pass')).status).toBe(200);
  });

  it('audits sign-ins, sign-outs, changes and resets', async () => {
    const signedIn = await login('admin@example.com', 'recovered-admin-pass');
    const cookie = String(signedIn.headers['set-cookie']?.[0]).split(';')[0] ?? '';
    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200);

    expect(await auditActions()).toEqual(
      expect.arrayContaining([
        'auth.login_succeeded',
        'auth.login_failed',
        'auth.logged_out',
        'password.changed',
        'password.reset_requested',
        'password.reset_completed',
      ]),
    );
  });
});
