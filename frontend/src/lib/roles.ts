import type { UserRole } from '../types/auth.ts';

// One name per role everywhere in the app, matching the backend's activation emails
export const roleLabel: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Company Admin',
  analyst: 'Analyst',
};

export const ADMIN_ROLES: UserRole[] = ['super_admin', 'org_admin'];
export const ALL_ROLES: UserRole[] = ['super_admin', 'org_admin', 'analyst'];

// Roles that can belong to a company; the super admin sits above every company
export type CompanyRole = Exclude<UserRole, 'super_admin'>;
export const COMPANY_ROLES: CompanyRole[] = ['org_admin', 'analyst'];

// Where each role lands after sign-in
export const homePathFor = (role: UserRole): string =>
  role === 'super_admin' ? '/companies' : role === 'org_admin' ? '/users' : '/profile';
