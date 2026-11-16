import { describe, expect, it } from 'vitest';
import { REDACTED, redactMetadata } from '../../src/domain/policies/audit-redaction.policy.ts';
import type { AuditMetadata } from '../../src/domain/types/audit.types.ts';

describe('redactMetadata', () => {
  it('blanks every key that looks like a secret, whatever its case', () => {
    const result = redactMetadata({
      password: 'hunter2',
      NewPassword: 'x',
      refresh_token: 'abc',
      accessToken: 'abc',
      clientSecret: 's',
      Authorization: 'Bearer abc',
      'set-cookie': 'sid=1',
      email: 'a@x.co',
    });

    expect(result).toEqual({
      password: REDACTED,
      NewPassword: REDACTED,
      refresh_token: REDACTED,
      accessToken: REDACTED,
      clientSecret: REDACTED,
      Authorization: REDACTED,
      'set-cookie': REDACTED,
      email: 'a@x.co',
    });
  });

  it('reaches into nested objects and arrays, such as a before/after diff', () => {
    const result = redactMetadata({
      before: { role: 't1_analyst', password: 'old' },
      after: { role: 'admin', password: 'new' },
      attempts: [{ token: 't1' }, { ok: true }],
    });

    expect(result).toEqual({
      before: { role: 't1_analyst', password: REDACTED },
      after: { role: 'admin', password: REDACTED },
      attempts: [{ token: REDACTED }, { ok: true }],
    });
  });

  it('keeps the few allow-listed keys that only look sensitive', () => {
    const result = redactMetadata({ tokenVersion: 4, passwordChangedAt: '2026-11-01T10:00:00Z' });
    expect(result).toEqual({ tokenVersion: 4, passwordChangedAt: '2026-11-01T10:00:00Z' });
  });

  it('judges keys, not values', () => {
    expect(redactMetadata({ reason: 'wrong password', note: 'token expired' })).toEqual({
      reason: 'wrong password',
      note: 'token expired',
    });
  });

  it('redacts a secret-named key whatever it holds, including an object or null', () => {
    expect(redactMetadata({ secret: { nested: 1 }, token: null })).toEqual({
      secret: REDACTED,
      token: REDACTED,
    });
  });

  it('does not modify what it was given', () => {
    const input: AuditMetadata = { password: 'p', nested: { token: 't' } };
    redactMetadata(input);
    expect(input).toEqual({ password: 'p', nested: { token: 't' } });
  });

  it('survives a cyclic value instead of overflowing the stack', () => {
    const cyclic: Record<string, unknown> = { name: 'loop' };
    cyclic.self = cyclic;

    const result = redactMetadata(cyclic as AuditMetadata);

    expect(JSON.stringify(result)).toContain('[TRUNCATED]');
  });
});
