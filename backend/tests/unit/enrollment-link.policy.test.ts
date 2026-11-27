import { describe, expect, it } from 'vitest';
import {
  ENROLLMENT_LINK_TTL_MS,
  agentKeyAad,
  defaultEnrollPublicUrl,
  enrollmentLinkExpiry,
  enrollmentLinkUrl,
} from '../../src/domain/policies/enrollment-link.policy.ts';

describe('enrollment link policy', () => {
  it.each([
    ['192.168.1.20', 'https://192.168.1.20:8443'],
    ['siem.example.com', 'https://siem.example.com:8443'],
    ['fd00::20', 'https://[fd00::20]:8443'],
  ])('builds the default address from WAZUH_PUBLIC_ADDRESS=%s', (address, expected) => {
    expect(defaultEnrollPublicUrl(address)).toBe(expected);
  });

  it('has no default without WAZUH_PUBLIC_ADDRESS', () => {
    expect(defaultEnrollPublicUrl(undefined)).toBeUndefined();
  });

  it('puts the token in the path only', () => {
    expect(enrollmentLinkUrl('https://siem.example.com:8443/', 'abc')).toBe(
      'https://siem.example.com:8443/e/abc',
    );
  });

  it('expires links after 24 hours', () => {
    const now = new Date('2026-11-27T10:00:00Z');
    expect(enrollmentLinkExpiry(now).toISOString()).toBe('2026-11-28T10:00:00.000Z');
    expect(ENROLLMENT_LINK_TTL_MS).toBe(86_400_000);
  });

  it('binds an agent key to its pending agent', () => {
    expect(agentKeyAad('a')).not.toBe(agentKeyAad('b'));
  });
});
