import { AuditAction } from '../enums/AuditAction.ts';
import { AuditCategory } from '../enums/AuditCategory.ts';
import type { IAuditActor } from '../types/audit.types.ts';

export const SYSTEM_ACTOR: Readonly<IAuditActor> = { userId: null, username: 'system', role: null };

export const AUDIT_CATEGORY_BY_ACTION: Readonly<Record<AuditAction, AuditCategory>> = {
  [AuditAction.SETUP_TOKEN_USED]: AuditCategory.AUTH,
  [AuditAction.SETUP_COMPLETED]: AuditCategory.SYSTEM,
  [AuditAction.LOGIN_SUCCEEDED]: AuditCategory.AUTH,
  [AuditAction.LOGIN_FAILED]: AuditCategory.AUTH,
  [AuditAction.LOGGED_OUT]: AuditCategory.AUTH,
  [AuditAction.USER_ROLE_CHANGED]: AuditCategory.USER,
  [AuditAction.USER_DISABLED]: AuditCategory.USER,
  [AuditAction.USER_ENABLED]: AuditCategory.USER,
  [AuditAction.INVITE_CREATED]: AuditCategory.USER,
  [AuditAction.INVITE_RESENT]: AuditCategory.USER,
  [AuditAction.INVITE_REVOKED]: AuditCategory.USER,
  [AuditAction.INVITE_ACCEPTED]: AuditCategory.USER,
  [AuditAction.PASSWORD_RESET_REQUESTED]: AuditCategory.AUTH,
  [AuditAction.PASSWORD_RESET_COMPLETED]: AuditCategory.AUTH,
  [AuditAction.PASSWORD_CHANGED]: AuditCategory.AUTH,
  [AuditAction.ACCOUNT_LOCKED]: AuditCategory.AUTH,
  [AuditAction.ACCESS_DENIED]: AuditCategory.AUTH,
  [AuditAction.USER_UPDATED]: AuditCategory.USER,
  [AuditAction.AUDIT_EXPORTED]: AuditCategory.SYSTEM,
  [AuditAction.SYSTEM_SETTINGS_CHANGED]: AuditCategory.SYSTEM,
  [AuditAction.EMAIL_TEST_SENT]: AuditCategory.SYSTEM,
};

export const AUDIT_QUERY_LIMITS = {
  MAX_RANGE_DAYS: 90,
  DEFAULT_RANGE_DAYS: 7,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  EXPORT_MAX_ROWS: 100_000,
  EXPORT_BATCH_SIZE: 1_000,
} as const;
