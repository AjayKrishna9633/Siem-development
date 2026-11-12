import { Permission } from '../enums/Permission.ts';
import { UserRole } from '../enums/UserRole.ts';

const TIER_1: readonly Permission[] = [
  Permission.ALERTS_VIEW,
  Permission.ALERTS_TRIAGE,
  Permission.ALERTS_CLOSE_FALSE_POSITIVE,
];

const TIER_2: readonly Permission[] = [
  ...TIER_1,
  Permission.ALERTS_WORK_ESCALATED,
  Permission.RULES_EDIT,
];

export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Permission[]>> = {
  [UserRole.T1_ANALYST]: TIER_1,
  [UserRole.T2_ANALYST]: TIER_2,
  [UserRole.ADMIN]: Object.values(Permission),
};

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  ROLE_PERMISSIONS[role].includes(permission);

export const permissionsFor = (role: UserRole): Permission[] => [...ROLE_PERMISSIONS[role]];
