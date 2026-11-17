import { describe, expect, it, vi } from 'vitest';
import { LoginUseCase } from '../../src/application/use-cases/auth/login.usecase.ts';
import { User } from '../../src/domain/entities/user.entity.ts';
import { AppErrorCode } from '../../src/domain/enums/AppErrorCode.ts';
import { LOGIN_LOCKOUT } from '../../src/domain/constants/security.ts';
import type { IUserRepository } from '../../src/application/interfaces/repositories/user.repository.interface.ts';
import type { IAuditEvent } from '../../src/application/interfaces/services/audit.service.interface.ts';
import type { IHashService } from '../../src/application/interfaces/services/hash.service.interface.ts';
import type { ISessionService } from '../../src/application/interfaces/services/session.service.interface.ts';

const now = new Date('2026-11-01T10:00:00Z');
const context = { ip: '203.0.113.7', userAgent: 'test' };

const hasher: IHashService = {
  hash: async (plain) => `hash:${plain}`,
  compare: async (plain, hash) => hash === `hash:${plain}` || hash === `old:${plain}`,
  needsRehash: (hash) => hash.startsWith('old:'),
};

const setup = (user: User | null) => {
  const saved: User[] = [];
  const audit: IAuditEvent[] = [];
  const users = {
    findByEmail: async () => user,
    save: async (u: User) => void saved.push(u),
  } as unknown as IUserRepository;
  const sessions = {
    issue: vi.fn(async () => ({ accessToken: 'access', refreshToken: 'refresh' })),
  } as unknown as ISessionService;
  const useCase = new LoginUseCase(users, hasher, sessions, {
    record: async (event: IAuditEvent) => void audit.push(event),
    prepare: () => {
      throw new Error('login never writes inside a transaction');
    },
  });
  return { useCase, saved, audit };
};

const adminWith = (passwordHash: string) =>
  User.createFirstAdmin({ id: 'u1', email: 'a@x.co', username: 'Ann', passwordHash, now });

describe('LoginUseCase', () => {
  it('signs in, audits the success and keeps the IP', async () => {
    const { useCase, audit, saved } = setup(adminWith('hash:pw-123456789012'));
    const session = await useCase.execute({
      email: 'a@x.co',
      password: 'pw-123456789012',
      context,
    });

    expect(session.accessToken).toBe('access');
    expect(audit.map((e) => e.action)).toEqual(['auth.login.success']);
    // Nobody is authenticated yet on a login, so the event names the user itself.
    expect(audit[0]).toMatchObject({ actor: { userId: 'u1', username: 'Ann', role: 'admin' } });
    expect(saved[0]?.toSnapshot().lastLoginIp).toBe('203.0.113.7');
  });

  it('gives the same error for an unknown account and records why', async () => {
    const { useCase, audit } = setup(null);
    await expect(
      useCase.execute({ email: 'nobody@x.co', password: 'whatever', context }),
    ).rejects.toMatchObject({ code: AppErrorCode.INVALID_CREDENTIALS });
    expect(audit[0]).toMatchObject({
      action: 'auth.login.failure',
      outcome: 'failure',
      actor: null,
      metadata: { email: 'nobody@x.co', reason: 'unknown_account' },
    });
  });

  it('records a wrong password against the account', async () => {
    const { useCase, audit } = setup(adminWith('hash:right-password'));
    await expect(
      useCase.execute({ email: 'a@x.co', password: 'wrong-password', context }),
    ).rejects.toMatchObject({ code: AppErrorCode.INVALID_CREDENTIALS });
    expect(audit[0]).toMatchObject({ targetId: 'u1', metadata: { reason: 'wrong_password' } });
  });

  it('records the lockout once, on the attempt that trips it, not on the ones before', async () => {
    const { useCase, audit } = setup(adminWith('hash:right-password'));
    const wrong = () => useCase.execute({ email: 'a@x.co', password: 'nope', context });

    for (let attempt = 1; attempt < LOGIN_LOCKOUT.MAX_FAILED_ATTEMPTS; attempt += 1) {
      await expect(wrong()).rejects.toBeDefined();
    }
    expect(audit.map((e) => e.action)).not.toContain('auth.account.locked');

    await expect(wrong()).rejects.toBeDefined();
    const locked = audit.filter((e) => e.action === 'auth.account.locked');
    expect(locked).toHaveLength(1);
    expect(locked[0]).toMatchObject({
      outcome: 'failure',
      targetId: 'u1',
      metadata: { lockedUntil: expect.any(String) },
    });

    // Further attempts hit the lock: they fail, but they don't re-announce it.
    await expect(wrong()).rejects.toBeDefined();
    expect(audit.filter((e) => e.action === 'auth.account.locked')).toHaveLength(1);
    expect(audit.at(-1)?.metadata).toMatchObject({ reason: 'locked' });
  });

  it('upgrades an old hash on a successful sign-in, without signing anyone out', async () => {
    const { useCase, saved } = setup(adminWith('old:pw-123456789012'));
    await useCase.execute({ email: 'a@x.co', password: 'pw-123456789012', context });

    expect(saved[0]?.passwordHash).toBe('hash:pw-123456789012');
    expect(saved[0]?.tokenVersion).toBe(0);
  });
});
