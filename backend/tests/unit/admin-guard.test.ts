import { describe, expect, it } from 'vitest';
import {
  assertAnAdminRemains,
  assertNotSelf,
} from '../../src/application/use-cases/users/admin-guard.ts';
import { User } from '../../src/domain/entities/user.entity.ts';
import { UserRole } from '../../src/domain/enums/UserRole.ts';
import { AppErrorCode } from '../../src/domain/enums/AppErrorCode.ts';

const now = new Date('2026-11-01T10:00:00Z');
const admin = () =>
  User.createFirstAdmin({ id: 'u1', email: 'a@x.co', username: 'Ann', passwordHash: 'h', now });

describe('last-admin protection', () => {
  it('refuses to demote the only active admin', () => {
    const user = admin();
    user.changeRole(UserRole.T1_ANALYST, now);
    expect(() => assertAnAdminRemains(true, user, 1)).toThrow(
      expect.objectContaining({ code: AppErrorCode.LAST_ADMIN }),
    );
  });

  it('refuses to disable the only active admin', () => {
    const user = admin();
    user.disable(now);
    expect(() => assertAnAdminRemains(true, user, 1)).toThrow(
      expect.objectContaining({ code: AppErrorCode.LAST_ADMIN }),
    );
  });

  it('allows it while another active admin remains', () => {
    const user = admin();
    user.changeRole(UserRole.T2_ANALYST, now);
    expect(() => assertAnAdminRemains(true, user, 2)).not.toThrow();
  });

  it('ignores changes to people who were not active admins', () => {
    const user = admin();
    user.changeRole(UserRole.T1_ANALYST, now);
    expect(() => assertAnAdminRemains(false, user, 1)).not.toThrow();
  });
});

describe('self-change protection', () => {
  it('refuses an admin acting on their own account', () => {
    expect(() => assertNotSelf({ userId: 'u1', role: UserRole.ADMIN }, 'u1')).toThrow(
      expect.objectContaining({ code: AppErrorCode.CANNOT_CHANGE_OWN_ACCESS }),
    );
  });

  it('allows acting on someone else', () => {
    expect(() => assertNotSelf({ userId: 'u1', role: UserRole.ADMIN }, 'u2')).not.toThrow();
  });
});
