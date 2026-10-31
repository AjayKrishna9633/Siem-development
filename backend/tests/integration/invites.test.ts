import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { auditActions, closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { PASSWORD, setupFirstAdmin, tokenFromLink, type ISignedInUser } from '../helpers/users.ts';

describe('invitations', () => {
  let admin: ISignedInUser;
  const asAdmin = () => ({ Authorization: `Bearer ${admin.token}` });
  const invite = (email: string, role = 't1_analyst') =>
    request(app).post('/api/users/invites').set(asAdmin()).send({ email, role });

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
  });
  afterAll(closeDatabase);

  it('creates an invited user who cannot sign in, and returns the link when email is off', async () => {
    const res = await invite('New.Person@Example.com');

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      email: 'new.person@example.com',
      status: 'invited',
      username: null,
    });
    expect(res.body.data.invite.delivered).toBe(false);
    expect(res.body.data.invite.link).toMatch(
      /^https:\/\/siem\.acme\.test\/accept-invite\?token=[0-9a-f]{64}$/,
    );

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'new.person@example.com', password: PASSWORD });
    expect(login.status).toBe(401);
  });

  it('stores only a hash of the token', async () => {
    const res = await invite('hashed@example.com');
    const token = tokenFromLink(res.body.data.invite.link);

    const rows = await AppDataSource.query<{ token_hash: string }[]>(
      'SELECT token_hash FROM auth_tokens WHERE user_id = $1',
      [res.body.data.user.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.token_hash).not.toBe(token);
  });

  it('accepts a link exactly once, even when submitted twice at the same moment', async () => {
    const res = await invite('once@example.com', 't2_analyst');
    const body = {
      token: tokenFromLink(res.body.data.invite.link),
      name: 'Once Only',
      password: PASSWORD,
    };

    const [first, second] = await Promise.all([
      request(app).post('/api/auth/invite/accept').send(body),
      request(app).post('/api/auth/invite/accept').send(body),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 400]);

    const winner = first.status === 200 ? first : second;
    expect(winner.body.data.user).toMatchObject({ username: 'Once Only', role: 't2_analyst' });

    const again = await request(app).post('/api/auth/invite/accept').send(body);
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('INVALID_INVITE');
  });

  it('rejects an expired link', async () => {
    const res = await invite('late@example.com');
    await AppDataSource.query(
      `UPDATE auth_tokens SET expires_at = now() - interval '1 minute' WHERE user_id = $1`,
      [res.body.data.user.id],
    );

    const preview = await request(app)
      .get('/api/auth/invite')
      .query({ token: tokenFromLink(res.body.data.invite.link) });
    expect(preview.status).toBe(400);
  });

  it('resending kills the old link and issues a working new one', async () => {
    const res = await invite('resend@example.com');
    const resent = await request(app)
      .post(`/api/users/${res.body.data.user.id}/invite/resend`)
      .set(asAdmin());
    expect(resent.status).toBe(200);

    const oldLink = await request(app)
      .get('/api/auth/invite')
      .query({ token: tokenFromLink(res.body.data.invite.link) });
    const newLink = await request(app)
      .get('/api/auth/invite')
      .query({ token: tokenFromLink(resent.body.data.link) });
    expect(oldLink.status).toBe(400);
    expect(newLink.status).toBe(200);
  });

  it('revoking deletes the invited user, so the email can be invited again', async () => {
    const res = await invite('revoke@example.com');
    await request(app)
      .delete(`/api/users/${res.body.data.user.id}/invite`)
      .set(asAdmin())
      .expect(200);

    const preview = await request(app)
      .get('/api/auth/invite')
      .query({ token: tokenFromLink(res.body.data.invite.link) });
    expect(preview.status).toBe(400);
    expect((await invite('revoke@example.com')).status).toBe(201);
  });

  it('lists only invites that are still pending', async () => {
    const res = await request(app).get('/api/users/invites').set(asAdmin());
    const emails = res.body.data.map((i: { email: string }) => i.email);

    expect(emails).toContain('new.person@example.com');
    expect(emails).not.toContain('once@example.com');
  });

  it('audits every step', async () => {
    expect(await auditActions()).toEqual(
      expect.arrayContaining([
        'invite.created',
        'invite.accepted',
        'invite.resent',
        'invite.revoked',
      ]),
    );
  });
});
