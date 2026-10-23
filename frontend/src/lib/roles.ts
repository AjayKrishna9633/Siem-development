import type { UserRole } from '../types/auth.ts';

export const roleLabel: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Org Admin',
  analyst: 'SOC Analyst',
};

export const ADMIN_ROLES: UserRole[] = ['super_admin', 'org_admin'];
export const ALL_ROLES: UserRole[] = ['super_admin', 'org_admin', 'analyst'];
