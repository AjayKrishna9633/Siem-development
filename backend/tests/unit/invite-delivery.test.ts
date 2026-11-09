import { describe, expect, it, vi } from 'vitest';
import { deliverInvite } from '../../src/application/use-cases/invites/invite-delivery.ts';
import { SystemSettings } from '../../src/domain/entities/system-settings.entity.ts';
import { User } from '../../src/domain/entities/user.entity.ts';
import { UserRole } from '../../src/domain/enums/UserRole.ts';
import { AuthTokenType } from '../../src/domain/enums/AuthTokenType.ts';
import type { ISystemSettingsRepository } from '../../src/application/interfaces/repositories/system-settings.repository.interface.ts';

const now = new Date('2026-11-01T10:00:00Z');
const expiresAt = new Date('2026-11-03T10:00:00Z');

const settings = SystemSettings.reconstitute({
  setupCompleted: true,
  setupTokenHash: null,
  setupTokenExpiresAt: null,
  orgName: 'Acme SOC',
  baseUrl: 'https://siem.acme.test',
  createdAt: now,
  updatedAt: now,
});

const invitee = User.createInvited({
  id: 'u2',
  email: 'new@acme.test',
  role: UserRole.T1_ANALYST,
  invitedById: 'u1',
  now,
});

const depsWith = (delivered: boolean) => {
  const tokens = {
    issue: vi.fn(async () => ({ token: 'abc123', expiresAt })),
    findUsable: vi.fn(),
    consume: vi.fn(),
  };
  const mailer = {
    sendInvite: vi.fn(async () => ({ delivered })),
    sendPasswordReset: vi.fn(async () => ({ delivered })),
  };
  const repo = { get: async () => settings } as unknown as ISystemSettingsRepository;
  return { deps: { settings: repo, tokens, mailer }, tokens, mailer };
};

describe('deliverInvite', () => {
  it('emails the link built from the base URL, and keeps it out of the response', async () => {
    const { deps, tokens, mailer } = depsWith(true);
    const result = await deliverInvite(deps, invitee, 'u1', false);

    expect(tokens.issue).toHaveBeenCalledWith('u2', AuthTokenType.INVITE, 'u1');
    expect(mailer.sendInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new@acme.test',
        link: 'https://siem.acme.test/accept-invite?token=abc123',
        orgName: 'Acme SOC',
      }),
    );
    expect(result).toEqual({ delivered: true, expiresAt });
  });

  it('hands the link back to the admin when the email was not delivered', async () => {
    const { deps } = depsWith(false);
    const result = await deliverInvite(deps, invitee, 'u1', true);

    expect(result).toEqual({
      delivered: false,
      expiresAt,
      link: 'https://siem.acme.test/accept-invite?token=abc123',
    });
  });
});
