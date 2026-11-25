import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  process.env.SETTINGS_ENCRYPTION_KEY = 'q4P8mY2v0xR5tK9wZ3nB7cF1hJ6lD0sG8aE2uI4oM5k=';
  return {
    logLines: [] as string[],
    sent: [] as { to: string; subject: string }[],
    acceptingHost: 'mail.accepts.test',
  };
});

// Every log line, at trace level, through the real redaction settings.
vi.mock('../../src/infrastructure/logging/logger.ts', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../src/infrastructure/logging/logger.ts')>();
  const { pino } = await import('pino');
  const { Writable } = await import('node:stream');
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      h.logLines.push(chunk.toString());
      done();
    },
  });
  const rootLogger = pino({ ...original.baseLoggerOptions, level: 'trace' }, stream);
  return { ...original, rootLogger, logger: new original.PinoLogger(rootLogger) };
});

// One host accepts mail without a real server; every other host goes through real nodemailer.
vi.mock('nodemailer', async (importOriginal) => {
  const original = await importOriginal<typeof import('nodemailer')>();
  const real = original.default;
  return {
    ...original,
    default: {
      ...real,
      createTransport: (options: { host?: string }) =>
        options.host === h.acceptingHost
          ? {
              verify: async () => true,
              sendMail: async (mail: { to: string; subject: string }) => {
                h.sent.push(mail);
                return {};
              },
              close: () => {},
            }
          : real.createTransport(options),
    },
  };
});

const { default: app } = await import('../../src/app.ts');
const { AppDataSource } = await import('../../src/infrastructure/database/data-source.ts');
const { closeDatabase, recreateDatabase } = await import('../helpers/database.ts');
const { addActiveUser, setupFirstAdmin } = await import('../helpers/users.ts');
type ISignedInUser = Awaited<ReturnType<typeof setupFirstAdmin>>;

const PASSWORD = 'Smtp-App-Password-9f3k2';
const NEW_PASSWORD = 'Rotated-App-Password-7x1q';
const responses: string[] = [];
const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });

const track = <T extends { text: string }>(res: T): T => {
  responses.push(res.text);
  return res;
};

const settingsBody = (overrides: Record<string, unknown> = {}) => ({
  host: 'smtp.example.com',
  port: 587,
  security: 'starttls',
  username: 'siem@example.com',
  password: PASSWORD,
  fromAddress: 'siem@example.com',
  fromName: 'SIEMple',
  ...overrides,
});

const auditRows = (action: string) =>
  AppDataSource.query<
    { outcome: string; target_label: string; metadata: Record<string, unknown> }[]
  >(
    `SELECT outcome, target_label, metadata FROM audit_logs WHERE action = $1 ORDER BY occurred_at`,
    [action],
  );

describe('email settings API', () => {
  let admin: ISignedInUser;
  let tester: ISignedInUser;
  let t1: ISignedInUser;
  let t2: ISignedInUser;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    tester = await addActiveUser(app, admin, 'tester@example.com', 'admin');
    t1 = await addActiveUser(app, admin, 't1@example.com', 't1_analyst');
    t2 = await addActiveUser(app, admin, 't2@example.com', 't2_analyst');
  });
  afterAll(closeDatabase);

  it.each(['t1', 't2'])(
    'forbids %s on every endpoint (settings.manage is admin-only)',
    async (who) => {
      const user = who === 't1' ? t1 : t2;
      track(await request(app).get('/api/settings/email').set(as(user)).expect(403));
      track(
        await request(app)
          .put('/api/settings/email')
          .set(as(user))
          .send(settingsBody())
          .expect(403),
      );
      track(await request(app).post('/api/settings/email/test').set(as(user)).send({}).expect(403));
      track(await request(app).delete('/api/settings/email').set(as(user)).expect(403));
    },
  );

  it('starts unconfigured, with the encryption key available', async () => {
    const res = track(await request(app).get('/api/settings/email').set(as(admin)).expect(200));
    expect(res.body.data).toMatchObject({
      source: 'none',
      enabled: false,
      passwordSet: false,
      lastTest: null,
      encryptionKeyConfigured: true,
    });
    expect(res.body.data).not.toHaveProperty('password');
  });

  it.each([
    ['a host with a space', { host: 'bad host' }],
    ['a URL as host', { host: 'smtp://x.com' }],
    ['port 0', { port: 0 }],
    ['port 70000', { port: 70000 }],
    ['an unknown security mode', { security: 'ssl' }],
    ['an invalid From', { fromAddress: 'not-an-email' }],
    ['a header-breaking name', { fromName: 'SIEMple\r\nBcc: x@evil.test' }],
  ])('rejects %s (400)', async (_label, overrides) => {
    track(
      await request(app)
        .put('/api/settings/email')
        .set(as(admin))
        .send(settingsBody(overrides))
        .expect(400),
    );
  });

  it('saves the settings, encrypts the password and audits field names only', async () => {
    const res = track(
      await request(app).put('/api/settings/email').set(as(admin)).send(settingsBody()).expect(200),
    );
    expect(res.body.data).toMatchObject({
      source: 'database',
      host: 'smtp.example.com',
      enabled: true,
      passwordSet: true,
    });

    const [row] = await AppDataSource.query<Record<string, unknown>[]>(
      'SELECT * FROM email_settings',
    );
    expect(JSON.stringify(row)).not.toContain(PASSWORD);
    expect(row?.updated_by).toBe(admin.id);

    const [audit] = await auditRows('system.settings.changed');
    expect(audit).toMatchObject({
      target_label: 'email',
      metadata: {
        section: 'email',
        changedFields: [
          'host',
          'port',
          'username',
          'fromAddress',
          'fromName',
          'enabled',
          'password',
        ],
      },
    });
  });

  it('keeps the stored password when the field is left empty', async () => {
    track(
      await request(app)
        .put('/api/settings/email')
        .set(as(admin))
        .send(settingsBody({ password: '', fromName: 'SIEMple Alerts' }))
        .expect(200),
    );
    const audits = await auditRows('system.settings.changed');
    expect(audits.at(-1)?.metadata).toEqual({ section: 'email', changedFields: ['fromName'] });
    const res = track(await request(app).get('/api/settings/email').set(as(admin)).expect(200));
    expect(res.body.data.passwordSet).toBe(true);
  });

  it('reports a failed test with a safe category, and records it', async () => {
    track(
      await request(app)
        .put('/api/settings/email')
        .set(as(admin))
        .send(
          settingsBody({ host: '127.0.0.1', port: 9, security: 'none', password: NEW_PASSWORD }),
        )
        .expect(200),
    );
    const res = track(
      await request(app).post('/api/settings/email/test').set(as(admin)).send({}).expect(200),
    );
    expect(res.body.data).toMatchObject({
      ok: false,
      to: 'admin@example.com',
      category: 'connection_refused',
      responseCode: null,
    });

    const view = track(await request(app).get('/api/settings/email').set(as(admin)).expect(200));
    expect(view.body.data.lastTest).toMatchObject({ ok: false });
    const [audit] = await auditRows('system.settings.email_test');
    expect(audit).toMatchObject({
      outcome: 'failure',
      metadata: { source: 'database', to: 'admin@example.com', category: 'connection_refused' },
    });
  });

  it('sends a test email to another address, and records the success', async () => {
    track(
      await request(app)
        .put('/api/settings/email')
        .set(as(admin))
        .send(settingsBody({ host: h.acceptingHost, password: '' }))
        .expect(200),
    );
    const res = track(
      await request(app)
        .post('/api/settings/email/test')
        .set(as(admin))
        .send({ to: 'someone@example.com' })
        .expect(200),
    );
    expect(res.body.data).toEqual({ ok: true, to: 'someone@example.com' });
    expect(h.sent.at(-1)).toMatchObject({
      to: 'someone@example.com',
      subject: 'SIEMple test email',
    });
    expect((await auditRows('system.settings.email_test')).at(-1)?.outcome).toBe('success');
  });

  it('sends invites through the saved settings, without a restart', async () => {
    const res = track(
      await request(app)
        .post('/api/users/invites')
        .set(as(admin))
        .send({ email: 'new.analyst@example.com', role: 't1_analyst' })
        .expect(201),
    );
    expect(res.body.data.invite.delivered).toBe(true);
    expect(h.sent.at(-1)?.to).toBe('new.analyst@example.com');
  });

  it('limits test emails to 5 a minute per admin', async () => {
    for (let i = 0; i < 5; i += 1) {
      track(
        await request(app).post('/api/settings/email/test').set(as(tester)).send({}).expect(200),
      );
    }
    const res = track(
      await request(app).post('/api/settings/email/test').set(as(tester)).send({}).expect(429),
    );
    expect(res.body.success).toBe(false);
  });

  it('turns email off and forgets the password', async () => {
    const res = track(await request(app).delete('/api/settings/email').set(as(admin)).expect(200));
    expect(res.body.data).toMatchObject({ source: 'none', enabled: false, passwordSet: false });
    const [row] = await AppDataSource.query<Record<string, unknown>[]>(
      'SELECT password_ciphertext, enabled FROM email_settings',
    );
    expect(row).toEqual({ password_ciphertext: null, enabled: false });
    expect((await auditRows('system.settings.changed')).at(-1)?.metadata).toEqual({
      section: 'email',
      changedFields: ['enabled', 'password'],
    });

    const test = track(
      await request(app).post('/api/settings/email/test').set(as(admin)).send({}).expect(409),
    );
    expect(test.body.code).toBe('EMAIL_NOT_CONFIGURED');
  });

  it('never puts the password in a response, a log line or the audit log', async () => {
    const audit = await AppDataSource.query<unknown[]>('SELECT * FROM audit_logs');
    expect(h.logLines.length).toBeGreaterThan(20);
    for (const secret of [PASSWORD, NEW_PASSWORD]) {
      expect(responses.join('\n')).not.toContain(secret);
      expect(h.logLines.join('\n')).not.toContain(secret);
      expect(JSON.stringify(audit)).not.toContain(secret);
    }
  });
});
