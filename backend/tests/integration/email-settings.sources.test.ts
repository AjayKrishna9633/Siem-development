import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const ENV_PASSWORD = 'Env-Smtp-Password-4471';

vi.hoisted(() => {
  process.env.SMTP_HOST = 'smtp.env.example';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_USER = 'alerts@env.example';
  process.env.SMTP_PASSWORD = 'Env-Smtp-Password-4471';
  delete process.env.SETTINGS_ENCRYPTION_KEY;
});

const { default: app } = await import('../../src/app.ts');
const { closeDatabase, recreateDatabase } = await import('../helpers/database.ts');
const { setupFirstAdmin } = await import('../helpers/users.ts');
type ISignedInUser = Awaited<ReturnType<typeof setupFirstAdmin>>;

const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });

describe('email settings managed by .env, without an encryption key', () => {
  let admin: ISignedInUser;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
  });
  afterAll(closeDatabase);

  it('shows SMTP_* as the read-only env source, without the password', async () => {
    const res = await request(app).get('/api/settings/email').set(as(admin)).expect(200);
    expect(res.body.data).toMatchObject({
      source: 'env',
      host: 'smtp.env.example',
      port: 465,
      security: 'tls',
      username: 'alerts@env.example',
      fromAddress: 'alerts@env.example',
      enabled: true,
      passwordSet: true,
      encryptionKeyConfigured: false,
    });
    expect(res.text).not.toContain(ENV_PASSWORD);
  });

  it('refuses to change or disable env-managed settings (409)', async () => {
    const put = await request(app)
      .put('/api/settings/email')
      .set(as(admin))
      .send({
        host: 'smtp.example.com',
        port: 587,
        security: 'starttls',
        username: null,
        fromAddress: 'siem@example.com',
      })
      .expect(409);
    expect(put.body.code).toBe('EMAIL_MANAGED_BY_ENV');
    const del = await request(app).delete('/api/settings/email').set(as(admin)).expect(409);
    expect(del.body.code).toBe('EMAIL_MANAGED_BY_ENV');
  });
});
