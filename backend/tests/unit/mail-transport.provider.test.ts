import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SMTPTransportOptions } from 'nodemailer';
import {
  MailTransportProvider,
  type CreateMailSender,
  type IEnvSmtpConfig,
} from '../../src/infrastructure/services/mail-transport.provider.ts';
import { EmailService } from '../../src/infrastructure/services/email.service.ts';
import { AesGcmSecretCipher } from '../../src/infrastructure/services/aes-gcm-secret-cipher.service.ts';
import type { IEmailSettingsRepository } from '../../src/application/interfaces/repositories/email-settings.repository.interface.ts';
import type { IMailSender } from '../../src/application/interfaces/services/mail-transport.provider.interface.ts';
import type { ILogger } from '../../src/application/interfaces/services/logger.interface.ts';
import type { IEmailSettings } from '../../src/domain/types/email-settings.types.ts';
import { SmtpSecurity } from '../../src/domain/enums/SmtpSecurity.ts';
import { SMTP_PASSWORD_AAD } from '../../src/domain/constants/email.ts';

const PASSWORD = 'db-smtp-password-123';
const cipher = new AesGcmSecretCipher(randomBytes(32).toString('base64'));

const ENV: IEnvSmtpConfig = {
  host: 'smtp.env.example',
  port: 587,
  secure: undefined,
  user: 'env@example.com',
  password: 'env-password',
  from: undefined,
};

const blank = (): IEmailSettings => ({
  host: null,
  port: null,
  security: SmtpSecurity.STARTTLS,
  username: null,
  password: null,
  fromAddress: null,
  fromName: null,
  enabled: false,
  lastTestAt: null,
  lastTestOk: null,
  lastTestError: null,
  updatedBy: null,
  updatedAt: new Date(),
});

const enabledDb = (overrides: Partial<IEmailSettings> = {}): IEmailSettings => ({
  ...blank(),
  host: 'smtp.db.example',
  port: 465,
  security: SmtpSecurity.TLS,
  username: 'db@example.com',
  password: cipher.encrypt(PASSWORD, SMTP_PASSWORD_AAD),
  fromAddress: 'siem@db.example',
  fromName: 'SIEMple Alerts',
  enabled: true,
  ...overrides,
});

let stored: IEmailSettings;
let repo: IEmailSettingsRepository & { get: ReturnType<typeof vi.fn> };
let built: {
  options: SMTPTransportOptions;
  sender: IMailSender & { sendMail: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
}[];
let warnings: unknown[][];
let logger: ILogger;

const create: CreateMailSender = (options) => {
  const sender = {
    sendMail: vi.fn().mockResolvedValue({}),
    verify: vi.fn().mockResolvedValue(true),
    close: vi.fn(),
  };
  built.push({ options, sender });
  return sender;
};

const provider = (env: IEnvSmtpConfig | null = null) =>
  new MailTransportProvider(env, repo, cipher, logger, create);

beforeEach(() => {
  stored = blank();
  repo = { get: vi.fn(async () => stored), save: vi.fn() };
  built = [];
  warnings = [];
  logger = {
    debug: () => {},
    info: () => {},
    warn: (...args: unknown[]) => void warnings.push(args),
    error: () => {},
    child: () => logger,
  };
});

describe('precedence', () => {
  it('1. uses SMTP_HOST from .env, even when database settings are enabled', async () => {
    stored = enabledDb();
    const p = provider(ENV);
    const transport = await p.current();
    expect(transport?.source).toBe('env');
    expect(built[0]?.options).toMatchObject({ host: 'smtp.env.example', port: 587, secure: false });
    expect(transport?.from).toBe('SIEMple <env@example.com>');
    expect(repo.get).not.toHaveBeenCalled();
  });

  it('2. uses enabled database settings when .env has no SMTP_HOST', async () => {
    stored = enabledDb();
    const transport = await provider().current();
    expect(transport?.source).toBe('database');
    expect(built[0]?.options).toMatchObject({
      host: 'smtp.db.example',
      port: 465,
      secure: true,
      auth: { user: 'db@example.com', pass: PASSWORD },
    });
    expect(transport?.from).toEqual({ name: 'SIEMple Alerts', address: 'siem@db.example' });
  });

  it('3. is not configured when database settings are disabled', async () => {
    stored = enabledDb({ enabled: false });
    const p = provider();
    expect(await p.current()).toBeNull();
    expect(await p.source()).toBe('none');
    expect(built).toHaveLength(0);
  });

  it.each<[string, Partial<IEmailSettings>]>([
    ['no host', { host: null }],
    ['no port', { port: null }],
    ['no from address', { fromAddress: null }],
  ])('is not configured when enabled settings are incomplete (%s)', async (_label, overrides) => {
    stored = enabledDb(overrides);
    expect(await provider().current()).toBeNull();
  });
});

describe('caching', () => {
  it('builds once, and rebuilds from fresh settings after invalidate()', async () => {
    stored = enabledDb();
    const p = provider();
    await p.current();
    await p.current();
    await p.source();
    expect(repo.get).toHaveBeenCalledTimes(1);
    expect(built).toHaveLength(1);

    stored = enabledDb({ host: 'smtp.changed.example' });
    p.invalidate();
    expect(built[0]?.sender.close).toHaveBeenCalled();
    await p.current();
    expect(repo.get).toHaveBeenCalledTimes(2);
    expect(built[1]?.options.host).toBe('smtp.changed.example');
  });

  it('turns email off after invalidate() when the settings were disabled', async () => {
    stored = enabledDb();
    const p = provider();
    expect(await p.source()).toBe('database');
    stored = enabledDb({ enabled: false });
    p.invalidate();
    expect(await p.source()).toBe('none');
  });

  it('shares one load between concurrent callers', async () => {
    stored = enabledDb();
    const p = provider();
    await Promise.all([p.current(), p.current(), p.current()]);
    expect(repo.get).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed load instead of caching the failure', async () => {
    repo.get.mockRejectedValueOnce(new Error('database down'));
    stored = enabledDb();
    const p = provider();
    await expect(p.current()).rejects.toThrow('database down');
    expect((await p.current())?.source).toBe('database');
  });
});

describe('security and timeouts', () => {
  it.each<[SmtpSecurity, Partial<SMTPTransportOptions>]>([
    [SmtpSecurity.TLS, { secure: true }],
    [SmtpSecurity.STARTTLS, { secure: false, requireTLS: true }],
    [SmtpSecurity.NONE, { secure: false, ignoreTLS: true }],
  ])('maps %s onto nodemailer options', async (security, expected) => {
    stored = enabledDb({ security });
    await provider().current();
    expect(built[0]?.options).toMatchObject(expected);
  });

  it('keeps .env on opportunistic STARTTLS, and implicit TLS on 465', async () => {
    await provider(ENV).current();
    expect(built[0]?.options.requireTLS).toBeUndefined();
    await provider({ ...ENV, port: 465 }).current();
    expect(built[1]?.options.secure).toBe(true);
  });

  it('sets connection, greeting and socket timeouts of 10 seconds', async () => {
    stored = enabledDb();
    await provider().current();
    await provider(ENV).current();
    for (const { options } of built) {
      expect(options).toMatchObject({
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
      });
    }
  });

  it('sends without auth when no username is set', async () => {
    stored = enabledDb({ username: null, password: null });
    await provider().current();
    expect(built[0]?.options.auth).toBeUndefined();
  });
});

describe('the stored password', () => {
  it('is decrypted only when the client is built', async () => {
    stored = enabledDb();
    const decrypt = vi.spyOn(cipher, 'decrypt');
    const p = provider();
    await p.current();
    await p.current();
    expect(decrypt).toHaveBeenCalledTimes(1);
    decrypt.mockRestore();
  });

  it('turns email off, with a warning that holds no secret, when it cannot be decrypted', async () => {
    const otherKey = new AesGcmSecretCipher(randomBytes(32).toString('base64'));
    stored = enabledDb({ password: otherKey.encrypt(PASSWORD, SMTP_PASSWORD_AAD) });
    expect(await provider().current()).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(JSON.stringify(warnings)).not.toContain(PASSWORD);
    expect(JSON.stringify(warnings)).not.toContain(stored.password!.ciphertext);
  });
});

describe('EmailService on top of the provider', () => {
  it.each<[string, IEnvSmtpConfig | null, () => IEmailSettings, boolean]>([
    ['env', ENV, blank, true],
    ['database', null, () => enabledDb(), true],
    ['none', null, blank, false],
  ])('isConfigured() for %s', async (_label, env, settings, expected) => {
    stored = settings();
    expect(await new EmailService(provider(env), logger).isConfigured()).toBe(expected);
  });

  it('sends through the database client, and reports delivered', async () => {
    stored = enabledDb();
    const service = new EmailService(provider(), logger);
    const result = await service.send({ to: 'a@example.com', subject: 'Hi', text: 'Hello' });
    expect(result).toEqual({ delivered: true });
    expect(built[0]?.sender.sendMail).toHaveBeenCalledWith({
      from: { name: 'SIEMple Alerts', address: 'siem@db.example' },
      to: 'a@example.com',
      subject: 'Hi',
      text: 'Hello',
    });
  });

  it('reports not delivered, without trying, when nothing is configured', async () => {
    const result = await new EmailService(provider(), logger).send({
      to: 'a@example.com',
      subject: 'Hi',
      text: 'Hello',
    });
    expect(result).toEqual({ delivered: false });
    expect(built).toHaveLength(0);
  });
});
