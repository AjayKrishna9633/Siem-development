import { describe, expect, it } from 'vitest';
import { ResolveSessionUserUseCase } from '../../src/application/use-cases/auth/resolve-session-user.usecase.ts';
import type { IUserRepository } from '../../src/application/interfaces/repositories/user.repository.interface.ts';
import { User } from '../../src/domain/entities/user.entity.ts';
import { UserRole } from '../../src/domain/enums/UserRole.ts';
import { AppErrorCode } from '../../src/domain/enums/AppErrorCode.ts';

const now = new Date('2026-11-01T10:00:00Z');

const activeAdmin = () =>
  User.createFirstAdmin({ id: 'u1', email: 'a@x.co', username: 'Ann', passwordHash: 'h', now });

const useCaseWith = (user: User | null) =>
  new ResolveSessionUserUseCase({ findById: async () => user } as unknown as IUserRepository);

describe('ResolveSessionUserUseCase', () => {
  it('returns the user as stored now, including a role changed since sign-in', async () => {
    const user = activeAdmin();
    user.changeRole(UserRole.T2_ANALYST, now);

    const resolved = await useCaseWith(user).execute({ userId: 'u1', tokenVersion: 0 });
    expect(resolved.role).toBe(UserRole.T2_ANALYST);
  });

  it('revokes the session of a disabled user', async () => {
    const user = activeAdmin();
    user.disable(now);

    await expect(
      useCaseWith(user).execute({ userId: 'u1', tokenVersion: user.tokenVersion }),
    ).rejects.toMatchObject({ code: AppErrorCode.SESSION_REVOKED });
  });

  it('revokes a session issued before a password change', async () => {
    const user = activeAdmin();
    user.changePassword('new-hash', now);

    await expect(
      useCaseWith(user).execute({ userId: 'u1', tokenVersion: 0 }),
    ).rejects.toMatchObject({ code: AppErrorCode.SESSION_REVOKED });
  });

  it('revokes the session of a deleted user', async () => {
    await expect(
      useCaseWith(null).execute({ userId: 'u1', tokenVersion: 0 }),
    ).rejects.toMatchObject({
      code: AppErrorCode.SESSION_REVOKED,
    });
  });
});
