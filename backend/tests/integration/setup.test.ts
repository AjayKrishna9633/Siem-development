import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import {
  auditActions,
  closeDatabase,
  countUsers,
  expireSetupToken,
  issueSetupToken,
  recreateDatabase,
} from '../helpers/database.ts';
import { di } from '../../src/infrastructure/di/index.ts';

// One fresh install, walked through in order. The steps share state on purpose: the
// setup guard remembers "completed" for the life of the process, exactly as in
// production, so "before setup" checks must run before setup is completed.
describe('first-run setup', () => {
  const admin = {
    adminName: 'Ada Admin',
    email: 'Ada@Example.com',
    password: 'correct-horse-battery',
    orgName: 'Acme SOC',
    baseUrl: 'https://siem.acme.test/',
    timezone: 'Asia/Kolkata',
  };
  let token: string;

  beforeAll(async () => {
    await recreateDatabase();
    token = await issueSetupToken();
  });
  afterAll(closeDatabase);

  it('blocks every API route with SETUP_REQUIRED, but not /health', async () => {
    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x@y.co', password: 'p' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('SETUP_REQUIRED');

    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
  });

  it('rejects a wrong token and records the attempt', async () => {
    const res = await request(app)
      .post('/api/setup/verify-token')
      .send({ token: 'f'.repeat(64) });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SETUP_TOKEN');
    expect(await auditActions()).toContain('setup.token_rejected');
  });

  it('keeps a live token across restarts instead of printing a new one', async () => {
    const onRestart = await di.issueSetupToken.execute({ replaceExisting: false });
    expect(onRestart.status).toBe('existing');

    const res = await request(app).post('/api/setup/verify-token').send({ token });
    expect(res.status).toBe(200);
  });

  it('rejects the right token once it has expired', async () => {
    await expireSetupToken();
    const res = await request(app).post('/api/setup/verify-token').send({ token });
    expect(res.status).toBe(400);

    token = await issueSetupToken();
  });

  it('creates the first admin, signs them in and closes setup', async () => {
    const res = await request(app)
      .post('/api/setup/complete')
      .send({ ...admin, token });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'ada@example.com', role: 'admin' });
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.headers['set-cookie']?.[0]).toMatch(/^refreshToken=.*HttpOnly/);
    expect(await auditActions()).toContain('setup.completed');
  });

  it('answers 404 on every setup route from then on, even with the old token', async () => {
    const verify = await request(app).post('/api/setup/verify-token').send({ token });
    const complete = await request(app)
      .post('/api/setup/complete')
      .send({ ...admin, email: 'second@example.com', token });

    expect(verify.status).toBe(404);
    expect(complete.status).toBe(404);
    expect(await countUsers()).toBe(1);
  });

  it('refuses to issue another setup token', async () => {
    const result = await di.issueSetupToken.execute({ replaceExisting: true });
    expect(result.status).toBe('completed');
  });

  it('opens the rest of the API, and the admin can sign in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: admin.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
  });
});
