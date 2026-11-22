import type { AuditCategory } from '../../../domain/enums/AuditCategory.ts';
import type { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';
import type { AuditMetadata } from '../../../domain/types/audit.types.ts';

export interface IAuditLogFilter {
  from: Date;
  to: Date;
  actorId?: string;
  category?: AuditCategory;
  action?: string;
  outcome?: AuditOutcome;
  q?: string;
}

// occurredAt keeps microseconds: a JS Date would round them and skip rows.
export interface IAuditCursor {
  occurredAt: string;
  id: string;
}

export interface IAuditLogEntry {
  id: string;
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
  nextCursor: string | null;
}

export interface IAuditLogExport {
  rowCount: number;
  rows: AsyncIterable<IAuditLogEntry>;
}
