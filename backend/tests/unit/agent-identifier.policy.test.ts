import { describe, expect, it } from 'vitest';
import {
  isAgentIdentifier,
  isEnrollmentPassword,
  isHostAddress,
  isIPv6,
  normalizeVersion,
  resolveAgentVersion,
} from '../../src/domain/policies/agent-identifier.policy.ts';

describe('isHostAddress', () => {
  it.each([
    '192.168.1.20',
    '10.0.0.1',
    'siem.example.com',
    'wazuh',
    'my-host.lan',
    '::1',
    'fd00::20',
    '2001:db8:0:0:0:0:0:1',
    '::ffff:192.168.1.20',
  ])('accepts %s', (value) => {
    expect(isHostAddress(value)).toBe(true);
  });

  it.each([
    '',
    '256.1.1.1',
    '1.2.3',
    '-bad.example.com',
    'bad-.example.com',
    'a b',
    'host;id',
    'http://siem.example.com',
    '1:2:3:4:5:6:7:8:9',
    '1::2::3',
    'x'.repeat(254),
  ])('rejects %j', (value) => {
    expect(isHostAddress(value)).toBe(false);
  });

  it('rejects an IPv6 address with too many groups around ::', () => {
    expect(isIPv6('1:2:3:4::5:6:7:8')).toBe(false);
  });
});

describe('identifiers and passwords', () => {
  it('matches the agent name and group pattern', () => {
    expect(isAgentIdentifier('web-01.prod_A')).toBe(true);
    expect(isAgentIdentifier('web 01')).toBe(false);
  });

  it('accepts only the shell-safe password charset, 20 characters or more', () => {
    expect(isEnrollmentPassword('Abc123-_.:@+=!#,xyz0')).toBe(true);
    expect(isEnrollmentPassword('Abc123-_.:@+=!#,xyz')).toBe(false);
    for (const unsafe of ["'", '"', '`', '$', '\\', ' ', '\n']) {
      expect(isEnrollmentPassword(`Abcdefghij0123456789${unsafe}`)).toBe(false);
    }
  });
});

describe('agent version', () => {
  it('normalizes the manager version Wazuh reports', () => {
    expect(normalizeVersion('v4.14.10')).toBe('4.14.10');
    expect(normalizeVersion('4.14')).toBeNull();
  });

  it("uses the manager's version, so the agent is never newer than the manager", () => {
    expect(resolveAgentVersion('v4.12.0', '4.14.10')).toBe('4.12.0');
    expect(resolveAgentVersion(null, '4.14.10')).toBe('4.14.10');
    expect(resolveAgentVersion('garbage', '4.14.10')).toBe('4.14.10');
  });
});
