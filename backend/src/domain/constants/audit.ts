import { AuditAction } from '../enums/AuditAction.ts';
import { AuditCategory } from '../enums/AuditCategory.ts';
import type { IAuditActor } from '../types/audit.types.ts';

// The actor for events nobody signed in for: CLI commands such as `reset-admin` and `seed`.
export const SYSTEM_ACTOR: Readonly<IAuditActor> = { userId: null, username: 'system', role: null };

// Every action belongs to exactly one category. Writers never pass a category, so a row
// can't be filed under the wrong one; a new action that is missing here fails to compile.
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
  // A refused permission is an authorization event, so it files under auth.
  [AuditAction.ACCESS_DENIED]: AuditCategory.AUTH,
  [AuditAction.USER_UPDATED]: AuditCategory.USER,
  [AuditAction.AUDIT_EXPORTED]: AuditCategory.SYSTEM,
  [AuditAction.INGEST_KEY_CREATED]: AuditCategory.SYSTEM,
  [AuditAction.INGEST_KEY_REVOKED]: AuditCategory.SYSTEM,
  [AuditAction.SYSTEM_SETTINGS_CHANGED]: AuditCategory.SYSTEM,
};

// Limits on reading the log back. Admin-only, but still bounded so one request can't scan the
// whole table or hold a connection for ever.
export const AUDIT_QUERY_LIMITS = {
  // Longest span between `from` and `to` one request may cover.
  MAX_RANGE_DAYS: 90,
  // When the caller gives no dates: the most recent week.
  DEFAULT_RANGE_DAYS: 7,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  // An export longer than this is refused with a request to narrow the range, instead of being
  // cut off silently.
  EXPORT_MAX_ROWS: 100_000,
  // Rows fetched per round trip while streaming an export.
  EXPORT_BATCH_SIZE: 1_000,
} as const;
