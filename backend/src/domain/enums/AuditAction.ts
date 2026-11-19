export enum AuditAction {
  // One action for both outcomes: success when the token opened setup, failure when it was wrong
  // or expired.
  SETUP_TOKEN_USED = 'auth.setup_token.used',
  SETUP_COMPLETED = 'system.setup.completed',
  LOGIN_SUCCEEDED = 'auth.login.success',
  LOGIN_FAILED = 'auth.login.failure',
  LOGGED_OUT = 'auth.logout',
  USER_ROLE_CHANGED = 'user.role.change',
  USER_DISABLED = 'user.disable',
  USER_ENABLED = 'user.enable',
  INVITE_CREATED = 'user.invite.create',
  INVITE_RESENT = 'user.invite.resend',
  INVITE_REVOKED = 'user.invite.revoke',
  INVITE_ACCEPTED = 'user.invite.accept',
  PASSWORD_RESET_REQUESTED = 'auth.password.reset_request',
  PASSWORD_RESET_COMPLETED = 'auth.password.reset',
  PASSWORD_CHANGED = 'auth.password.change',
  ACCOUNT_LOCKED = 'auth.account.locked',
  ACCESS_DENIED = 'access.denied',
  USER_UPDATED = 'user.update',
  AUDIT_EXPORTED = 'audit.export',
  // Reserved: there is no settings-editing feature yet. The name is fixed now so the first
  // writer doesn't invent a different one.
  SYSTEM_SETTINGS_CHANGED = 'system.settings.changed',
}

export enum AuditTargetType {
  USER = 'user',
  SYSTEM_SETTINGS = 'system_settings',
}
