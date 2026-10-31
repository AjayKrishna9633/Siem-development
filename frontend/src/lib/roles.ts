import type { UserRole } from '../types/auth.ts';

// One name per role everywhere in the app, matching the backend's activation emails
export const roleLabel: Record<UserRole, string> = {
  admin: 'Administrator',
  t2_analyst: 'Tier 2 Analyst',
  t1_analyst: 'Tier 1 Analyst',
};

// What each role can do, shown when an admin picks a role for someone
export const roleDescription: Record<UserRole, string> = {
  t1_analyst: 'Views and triages alerts, closes false positives and escalates to Tier 2.',
  t2_analyst: 'Everything Tier 1 can do, plus works escalated alerts and edits detection rules.',
  admin: 'Full access, including users, settings and the audit log.',
};

// Least access first, so a form defaults to the safest choice
export const ALL_ROLES: UserRole[] = ['t1_analyst', 't2_analyst', 'admin'];

// Where each role lands after sign-in
export const homePathFor = (role: UserRole): string => (role === 'admin' ? '/users' : '/profile');
