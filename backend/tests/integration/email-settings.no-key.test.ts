import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  delete process.env.SETTINGS_ENCRYPTION_KEY;
});

const { default: app } = await import('../../src/app.ts');
const { closeDatabase, recreateDatabase } = await import('../helpers/database.ts');
const { setupFirstAdmin } = await import('../helpers/users.ts');
type ISignedInUser = Awaited<ReturnType<typeof setupFirstAdmin>>;

const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });

const body = (overrides: Record<string, unknown> = {}) => ({
  host: 'smtp.example.com',
  port: 587,
  security: 'starttls',
  username: 'siem@example.com',
  password: 'Some-Password-123',
  fromAddress: 'siem@example.com',
  ...overrides,
});

describe('email settings without SETTINGS_ENCRYPTION_KEY', () => {
  let admin: ISignedInUser;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
  });
  afterAll(closeDatabase);

  it('says the key is missing instead of crashing', async () => {
    const res = await request(app).get('/api/settings/email').set(as(admin)).expect(200);
    expect(res.body.data).toMatchObject({ source: 'none', encryptionKeyConfigured: false });
  });

  it('refuses to store a password (409) and saves nothing', async () => {
    const res = await request(app)
      .put('/api/settings/email')
      .set(as(admin))
      .send(body())
      .expect(409);
    expect(res.body.code).toBe('ENCRYPTION_KEY_NOT_CONFIGURED');
    const after = await request(app).get('/api/settings/email').set(as(admin)).expect(200);
    expect(after.body.data).toMatchObject({ source: 'none', host: null });
  });

  it('still saves a server that needs no login', async () => {
    const res = await request(app)
      .put('/api/settings/email')
      .set(as(admin))
      .send(body({ username: '', password: '' }))
      .expect(200);
    expect(res.body.data).toMatchObject({ source: 'database', username: null, passwordSet: false });
  });
});
