import { describe, expect, it } from 'vitest';
import { hasPermission } from '../../src/domain/policies/permissions.policy.ts';
import { Permission } from '../../src/domain/enums/Permission.ts';
import { UserRole } from '../../src/domain/enums/UserRole.ts';

const { ADMIN, T2_ANALYST, T1_ANALYST } = UserRole;

const MATRIX: [Permission, boolean, boolean, boolean][] = [
  [Permission.ALERTS_VIEW, true, true, true],
  [Permission.ALERTS_TRIAGE, true, true, true],
  [Permission.ALERTS_CLOSE_FALSE_POSITIVE, true, true, true],
  [Permission.ALERTS_WORK_ESCALATED, true, true, false],
  [Permission.RULES_EDIT, true, true, false],
  [Permission.USERS_MANAGE, true, false, false],
  [Permission.SETTINGS_MANAGE, true, false, false],
  [Permission.AUDIT_VIEW, true, false, false],
];

describe('role permissions', () => {
  it.each(MATRIX)('%s: admin=%s t2=%s t1=%s', (permission, admin, t2, t1) => {
    expect(hasPermission(ADMIN, permission)).toBe(admin);
    expect(hasPermission(T2_ANALYST, permission)).toBe(t2);
    expect(hasPermission(T1_ANALYST, permission)).toBe(t1);
  });

  it('covers every permission that exists', () => {
    expect(MATRIX.map(([p]) => p).sort()).toEqual(Object.values(Permission).sort());
  });
});
