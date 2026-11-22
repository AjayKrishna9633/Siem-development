import type { AuditCategory, AuditOutcome, AuditRange } from '../types/audit.types.ts';

export const ACTION_LABELS: Readonly<Record<string, string>> = {
  'auth.login.success': 'Signed in',
  'auth.login.failure': 'Failed sign-in',
  'auth.logout': 'Signed out',
  'auth.password.change': 'Changed password',
  'auth.password.reset_request': 'Requested a password reset',
  'auth.password.reset': 'Reset password',
  'auth.account.locked': 'Account locked',
  'auth.setup_token.used': 'Used the setup token',
  'access.denied': 'Access denied',
  'user.update': 'Updated a user',
  'user.role.change': 'Changed a role',
  'user.disable': 'Disabled a user',
  'user.enable': 'Enabled a user',
  'user.invite.create': 'Invited a user',
  'user.invite.resend': 'Resent an invitation',
  'user.invite.revoke': 'Revoked an invitation',
  'user.invite.accept': 'Accepted an invitation',
  'system.setup.completed': 'Completed initial setup',
  'system.settings.changed': 'Changed system settings',
  'audit.export': 'Exported the audit log',
};

const sentenceCase = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export const humanize = (value: string): string =>
  sentenceCase(value.replace(/[._]+/g, ' ').trim());

export const actionLabel = (action: string): string => ACTION_LABELS[action] ?? humanize(action);

export const CHANGED_FIELD_BY_ACTION: Readonly<Record<string, string>> = {
  'user.role.change': 'Role',
};

export const CATEGORY_LABELS: Readonly<Record<AuditCategory, string>> = {
  auth: 'Authentication',
  user: 'Users',
  system: 'System',
  agent: 'Agents',
  rule: 'Rules',
  alert: 'Alerts',
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as AuditCategory[]).map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

export const OUTCOME_LABELS: Readonly<Record<AuditOutcome, string>> = {
  success: 'Success',
  failure: 'Failure',
  denied: 'Denied',
};

export const OUTCOME_OPTIONS = (Object.keys(OUTCOME_LABELS) as AuditOutcome[]).map((value) => ({
  value,
  label: OUTCOME_LABELS[value],
}));

export const RANGE_OPTIONS: readonly AuditRange[] = ['24h', '7d', '30d', 'custom'];

export const RANGE_LABELS: Readonly<Record<AuditRange, string>> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  custom: 'Custom range',
};
