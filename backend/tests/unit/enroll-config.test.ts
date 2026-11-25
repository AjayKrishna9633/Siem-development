import { describe, expect, it } from 'vitest';
import { parseEnrollConfig } from '../../src/enroll/config.ts';

const url = 'postgres://siemple_enroll:secret@postgres:5432/siemple';

describe('enrollment service config', () => {
  it('starts with only its database URL, without any of the API secrets', () => {
    const result = parseEnrollConfig({ ENROLL_DATABASE_URL: url });
    expect(result).toEqual({
      ok: true,
      config: { NODE_ENV: 'development', ENROLL_PORT: 8443, ENROLL_DATABASE_URL: url },
    });
  });

  it('ignores the API secrets even when they are set', () => {
    const result = parseEnrollConfig({
      ENROLL_DATABASE_URL: url,
      JWT_SECRET: 'x'.repeat(40),
      DATABASE_URL: 'postgres://owner:owner@postgres/siemple',
      SETTINGS_ENCRYPTION_KEY: 'a'.repeat(44),
    });
    expect(result.ok && Object.keys(result.config).sort()).toEqual([
      'ENROLL_DATABASE_URL',
      'ENROLL_PORT',
      'NODE_ENV',
    ]);
  });

  it('refuses to start without a database URL', () => {
    const result = parseEnrollConfig({});
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.ENROLL_DATABASE_URL).toBeTruthy();
  });

  it.each([['0'], ['70000'], ['https']])('refuses ENROLL_PORT=%s', (port) => {
    expect(parseEnrollConfig({ ENROLL_DATABASE_URL: url, ENROLL_PORT: port }).ok).toBe(false);
  });
});
