import { describe, expect, it } from 'vitest';
import { SystemSettings } from '../../src/domain/entities/system-settings.entity.ts';
import { DomainError } from '../../src/domain/errors/DomainError.ts';

const now = new Date('2026-11-01T10:00:00Z');
const inOneHour = new Date('2026-11-01T11:00:00Z');
const details = { orgName: 'Acme SOC', baseUrl: 'https://siem.acme.test', timezone: 'UTC' };

const pendingSettings = () =>
  SystemSettings.reconstitute({
    setupCompleted: false,
    setupTokenHash: null,
    setupTokenExpiresAt: null,
    orgName: null,
    baseUrl: null,
    timezone: null,
    createdAt: now,
    updatedAt: now,
  });

describe('SystemSettings', () => {
  it('has no live token until one is issued', () => {
    const settings = pendingSettings();
    expect(settings.hasLiveSetupToken(now)).toBe(false);

    settings.issueSetupToken('a'.repeat(64), inOneHour, now);
    expect(settings.hasLiveSetupToken(now)).toBe(true);
  });

  it('treats a token as dead from its expiry time on', () => {
    const settings = pendingSettings();
    settings.issueSetupToken('a'.repeat(64), inOneHour, now);
    expect(settings.hasLiveSetupToken(inOneHour)).toBe(false);
  });

  it('completing setup records the details and destroys the token', () => {
    const settings = pendingSettings();
    settings.issueSetupToken('a'.repeat(64), inOneHour, now);
    settings.completeSetup(details, now);

    expect(settings.isSetupCompleted).toBe(true);
    expect(settings.setupTokenHash).toBeNull();
    expect(settings.hasLiveSetupToken(now)).toBe(false);
    expect(settings.orgName).toBe('Acme SOC');
  });

  it('can never be completed twice or given a new token afterwards', () => {
    const settings = pendingSettings();
    settings.completeSetup(details, now);

    expect(() => settings.completeSetup(details, now)).toThrow(DomainError);
    expect(() => settings.issueSetupToken('b'.repeat(64), inOneHour, now)).toThrow(DomainError);
  });
});
