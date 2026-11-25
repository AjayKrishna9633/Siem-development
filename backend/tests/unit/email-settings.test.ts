import { describe, expect, it } from 'vitest';
import { classifySmtpError } from '../../src/infrastructure/services/smtp-email-tester.service.ts';
import {
  changedEmailFields,
  toEmailSettingsView,
  touchesConnection,
} from '../../src/application/use-cases/email-settings/email-settings-view.ts';
import { redactMetadata, REDACTED } from '../../src/domain/policies/audit-redaction.policy.ts';
import type { IEmailSettings } from '../../src/domain/types/email-settings.types.ts';
import { SmtpSecurity } from '../../src/domain/enums/SmtpSecurity.ts';

const settings = (overrides: Partial<IEmailSettings> = {}): IEmailSettings => ({
  host: 'smtp.example.com',
  port: 587,
  security: SmtpSecurity.STARTTLS,
  username: 'siem@example.com',
  password: { ciphertext: 'c', iv: 'i', authTag: 't', keyVersion: 1 },
  fromAddress: 'siem@example.com',
  fromName: 'SIEMple',
  enabled: true,
  lastTestAt: null,
  lastTestOk: null,
  lastTestError: null,
  updatedBy: null,
  updatedAt: new Date(),
  ...overrides,
});

describe('classifySmtpError', () => {
  it.each<[string, object, string, number | null]>([
    ['bad login', { code: 'EAUTH', responseCode: 535, command: 'AUTH PLAIN' }, 'auth_failed', 535],
    ['TLS failure', { code: 'ETLS', message: 'TLS negotiation failed' }, 'tls_error', null],
    [
      'plain port with TLS',
      { code: 'ESOCKET', message: 'wrong version number' },
      'tls_error',
      null,
    ],
    ['DNS', { code: 'EDNS', message: 'getaddrinfo ENOTFOUND smtp.x' }, 'host_not_found', null],
    ['timeout', { code: 'ETIMEDOUT', message: 'Connection timeout' }, 'connection_timeout', null],
    [
      'refused',
      { code: 'ESOCKET', message: 'connect ECONNREFUSED 127.0.0.1:25' },
      'connection_refused',
      null,
    ],
    [
      'sender',
      { code: 'EENVELOPE', responseCode: 553, command: 'MAIL FROM' },
      'sender_rejected',
      553,
    ],
    [
      'recipient',
      { code: 'EENVELOPE', responseCode: 550, command: 'RCPT TO' },
      'recipient_rejected',
      550,
    ],
    ['anything else', { message: 'odd' }, 'unknown', null],
    ['not an object', 'boom', 'unknown', null],
  ])('%s', (_label, err, category, responseCode) => {
    expect(classifySmtpError(err)).toEqual({ category, responseCode });
  });

  it('never returns the server reply, even when it repeats the password', () => {
    const err = { code: 'EAUTH', responseCode: 535, response: '535 bad password hunter2' };
    expect(JSON.stringify(classifySmtpError(err))).not.toContain('hunter2');
  });
});

describe('the settings view', () => {
  it('reports whether a password is stored, never the password', () => {
    const view = toEmailSettingsView(settings(), null, true);
    expect(view).toMatchObject({ source: 'database', passwordSet: true });
    expect(Object.keys(view)).not.toContain('password');
  });

  it('shows .env settings as the env source, read from SMTP_*', () => {
    const view = toEmailSettingsView(
      settings({ enabled: false }),
      {
        host: 'smtp.env',
        port: 465,
        secure: undefined,
        user: 'u@x',
        password: 'p',
        from: undefined,
      },
      false,
    );
    expect(view).toMatchObject({
      source: 'env',
      host: 'smtp.env',
      security: SmtpSecurity.TLS,
      username: 'u@x',
      fromAddress: 'u@x',
      enabled: true,
      passwordSet: true,
      encryptionKeyConfigured: false,
    });
  });

  it('is none while disabled', () => {
    expect(toEmailSettingsView(settings({ enabled: false }), null, true).source).toBe('none');
  });
});

describe('changed fields', () => {
  it('lists field names only, password last when it changed', () => {
    const before = settings();
    const after = settings({ host: 'smtp.new.example', fromName: 'Alerts' });
    expect(changedEmailFields(before, after, true)).toEqual(['host', 'fromName', 'password']);
    expect(changedEmailFields(before, before, false)).toEqual([]);
  });

  it('knows which changes make the last test stale', () => {
    expect(touchesConnection(['fromName'])).toBe(false);
    expect(touchesConnection(['fromName', 'password'])).toBe(true);
    expect(touchesConnection(['port'])).toBe(true);
  });
});

describe('audit redaction covers SMTP secrets', () => {
  it.each(['password', 'smtpPassword', 'SMTP_PASSWORD', 'password_ciphertext', 'newPassword'])(
    'masks %s at any depth',
    (key) => {
      expect(redactMetadata({ smtp: { [key]: 'hunter2' } })).toEqual({ smtp: { [key]: REDACTED } });
    },
  );

  it('keeps changedFields, which holds names, not values', () => {
    const metadata = { section: 'email', changedFields: ['host', 'password'] };
    expect(redactMetadata(metadata)).toEqual(metadata);
  });
});
