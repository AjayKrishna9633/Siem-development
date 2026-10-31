// What a signed-in user may do. Code checks these, never role names, so changing what
// a role can do is a one-line edit in permissions.policy.ts.
export enum Permission {
  ALERTS_VIEW = 'alerts.view',
  ALERTS_TRIAGE = 'alerts.triage',
  ALERTS_CLOSE_FALSE_POSITIVE = 'alerts.close_fp',
  // Pick up and work alerts that Tier 1 escalated
  ALERTS_WORK_ESCALATED = 'alerts.work_escalated',
  RULES_EDIT = 'rules.edit',
  USERS_MANAGE = 'users.manage',
  SETTINGS_MANAGE = 'settings.manage',
  AUDIT_VIEW = 'audit.view',
}
