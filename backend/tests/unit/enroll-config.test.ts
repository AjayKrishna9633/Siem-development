import { describe, expect, it } from 'vitest';
import { parseEnrollConfig } from '../../src/enroll/config.ts';

const url = 'postgres://siemple_enroll:secret@postgres:5432/siemple';
const key = Buffer.alloc(32, 7).toString('base64');
const minimal = { ENROLL_DATABASE_URL: url, ENROLL_KEY_SECRET: key };

describe('enrollment service config', () => {
  it('starts with its database URL and key, without any of the API secrets', () => {
    expect(parseEnrollConfig({ ...minimal, WAZUH_PUBLIC_ADDRESS: '192.168.1.20' })).toEqual({
      ok: true,
      config: {
        NODE_ENV: 'development',
        ENROLL_PORT: 8443,
        ENROLL_DATABASE_URL: url,
        ENROLL_KEY_SECRET: key,
        WAZUH_PUBLIC_ADDRESS: '192.168.1.20',
      },
    });
  });

  it('ignores the API secrets even when they are set', () => {
    const result = parseEnrollConfig({
      ...minimal,
      JWT_SECRET: 'x'.repeat(40),
      DATABASE_URL: 'postgres://owner:owner@postgres/siemple',
      REDIS_URL: 'redis://:pw@redis:6379',
      SMTP_PASSWORD: 'smtp-secret',
      WAZUH_API_PASSWORD: 'Wazuh-api-pass.1',
      WAZUH_ENROLLMENT_PASSWORD: 'enrollment-password-20chars',
      SETTINGS_ENCRYPTION_KEY: 'a'.repeat(44),
    });
    expect(result.ok && Object.keys(result.config).sort()).toEqual([
      'ENROLL_DATABASE_URL',
      'ENROLL_KEY_SECRET',
      'ENROLL_PORT',
      'NODE_ENV',
    ]);
  });

  it('starts without WAZUH_PUBLIC_ADDRESS (scripts then answer 503)', () => {
    expect(parseEnrollConfig({ ...minimal, WAZUH_PUBLIC_ADDRESS: '' }).ok).toBe(true);
  });

  it.each([
    ['no database URL', { ENROLL_KEY_SECRET: key }, 'ENROLL_DATABASE_URL'],
    ['no key', { ENROLL_DATABASE_URL: url }, 'ENROLL_KEY_SECRET'],
    ['a short key', { ...minimal, ENROLL_KEY_SECRET: 'c2hvcnQ=' }, 'ENROLL_KEY_SECRET'],
    [
      'a bad address',
      { ...minimal, WAZUH_PUBLIC_ADDRESS: 'not an address!' },
      'WAZUH_PUBLIC_ADDRESS',
    ],
  ])('refuses to start with %s', (_label, env, field) => {
    const result = parseEnrollConfig(env);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[field]).toBeTruthy();
  });

  it.each([['0'], ['70000'], ['https']])('refuses ENROLL_PORT=%s', (port) => {
    expect(parseEnrollConfig({ ...minimal, ENROLL_PORT: port }).ok).toBe(false);
  });
});
