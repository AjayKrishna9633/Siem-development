import { describe, expect, it } from 'vitest';
import { OpaqueTokenService } from '../../src/infrastructure/services/opaque-token.service.ts';

describe('OpaqueTokenService', () => {
  const service = new OpaqueTokenService();

  it('generates a 32-byte hex token and its SHA-256 hash', () => {
    const { token, hash } = service.generate();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(service.hash(token)).toBe(hash);
  });

  it('never repeats a token', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => service.generate().token));
    expect(tokens.size).toBe(50);
  });

  it('matches only the token the hash was made from', () => {
    const { token, hash } = service.generate();
    expect(service.matches(token, hash)).toBe(true);
    expect(service.matches(service.generate().token, hash)).toBe(false);
  });

  it('rejects instead of throwing when the stored hash is malformed', () => {
    const { token } = service.generate();
    expect(service.matches(token, 'not-a-hash')).toBe(false);
    expect(service.matches(token, '')).toBe(false);
  });
});
