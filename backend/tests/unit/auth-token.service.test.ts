import { describe, expect, it, vi } from 'vitest';
import { AuthTokenService } from '../../src/infrastructure/services/auth-token.service.ts';
import { OpaqueTokenService } from '../../src/infrastructure/services/opaque-token.service.ts';
import { AuthTokenType } from '../../src/domain/enums/AuthTokenType.ts';
import type {
  IAuthTokenRepository,
  INewAuthToken,
} from '../../src/application/interfaces/repositories/auth-token.repository.interface.ts';

const HOUR = 60 * 60_000;

const setup = () => {
  const repo = {
    replace: vi.fn(async (_token: INewAuthToken) => undefined),
    findUsableByHash: vi.fn(async () => null),
    consume: vi.fn(async () => true),
    findUnusedByType: vi.fn(async () => []),
  } satisfies IAuthTokenRepository;
  const opaque = new OpaqueTokenService();
  return { repo, opaque, service: new AuthTokenService(repo, opaque) };
};

describe('AuthTokenService', () => {
  it('stores only the hash of the token it hands out', async () => {
    const { repo, opaque, service } = setup();
    const { token } = await service.issue('u1', AuthTokenType.INVITE, 'admin');

    const stored = repo.replace.mock.calls[0]?.[0];
    expect(stored?.tokenHash).toBe(opaque.hash(token));
    expect(stored?.tokenHash).not.toBe(token);
    expect(stored).toMatchObject({ userId: 'u1', type: AuthTokenType.INVITE, createdBy: 'admin' });
  });

  it('gives invites 48 hours and reset links 30 minutes', async () => {
    const { service } = setup();
    const before = Date.now();

    const invite = await service.issue('u1', AuthTokenType.INVITE, null);
    const reset = await service.issue('u1', AuthTokenType.RESET, null);

    expect(invite.expiresAt.getTime() - before).toBeGreaterThanOrEqual(48 * HOUR - 1000);
    expect(invite.expiresAt.getTime() - before).toBeLessThanOrEqual(48 * HOUR + 1000);
    expect(reset.expiresAt.getTime() - before).toBeLessThanOrEqual(30 * 60_000 + 1000);
  });

  it('looks tokens up by their hash, never the raw value', async () => {
    const { repo, opaque, service } = setup();
    await service.findUsable('rawtoken', AuthTokenType.RESET);

    expect(repo.findUsableByHash).toHaveBeenCalledWith(
      opaque.hash('rawtoken'),
      AuthTokenType.RESET,
      expect.any(Date),
    );
  });
});
