import type { AuditCategory } from '../../../domain/enums/AuditCategory.ts';
import type { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';
import type { AuditMetadata } from '../../../domain/types/audit.types.ts';

// A resolved filter: the date range is always concrete by the time it reaches the database.
export interface IAuditLogFilter {
  from: Date;
  to: Date;
  actorId?: string;
  category?: AuditCategory;
  // Exact match on the action string, e.g. `auth.login.failure`.
  action?: string;
  outcome?: AuditOutcome;
  // Free text over actor name, target label and action.
  q?: string;
}

// Where the previous page ended. occurredAt is the exact timestamp text from the database,
// microseconds included: a JS Date holds only milliseconds, and rounding it would skip or repeat
// rows that share a millisecond.
export interface IAuditCursor {
  occurredAt: string;
  id: string;
}

export interface IAuditLogEntry {
  id: string;
  // ISO 8601 with microseconds, straight from the database.
  occurredAt: string;
  actorId: string | null;
  actorUsername: string | null;
  actorRole: string | null;
  action: string;
  category: AuditCategory;
  outcome: AuditOutcome;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: AuditMetadata;
}

export interface IAuditLogPage {
  items: IAuditLogEntry[];
  // null on the last page. Opaque to callers.
  nextCursor: string | null;
}

export interface IAuditLogExport {
  rowCount: number;
  rows: AsyncIterable<IAuditLogEntry>;
}
