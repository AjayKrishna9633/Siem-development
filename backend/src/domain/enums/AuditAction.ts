// What happened, as stored in audit_logs.action. Named <area>.<event>.
export enum AuditAction {
  SETUP_TOKEN_REJECTED = 'setup.token_rejected',
  SETUP_COMPLETED = 'setup.completed',
  USER_ROLE_CHANGED = 'user.role_changed',
  USER_DISABLED = 'user.disabled',
  USER_ENABLED = 'user.enabled',
  INVITE_CREATED = 'invite.created',
  INVITE_RESENT = 'invite.resent',
  INVITE_REVOKED = 'invite.revoked',
  INVITE_ACCEPTED = 'invite.accepted',
}

// What the action was done to, as stored in audit_logs.target_type
export enum AuditTargetType {
  USER = 'user',
  SYSTEM_SETTINGS = 'system_settings',
}
