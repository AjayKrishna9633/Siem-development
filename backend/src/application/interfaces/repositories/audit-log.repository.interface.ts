import type { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import type { AuditCategory } from '../../../domain/enums/AuditCategory.ts';
import type { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';
import type { AuditMetadata } from '../../../domain/types/audit.types.ts';
import type {
  IAuditCursor,
  IAuditLogEntry,
  IAuditLogFilter,
} from '../../types/use-case/audit.types.ts';

export type { AuditMetadata } from '../../../domain/types/audit.types.ts';

// A fully resolved row, exactly as stored. AuditService is the only thing that builds one.
export interface IAuditRecord {
  actorId: string | null;
  actorUsername: string | null;
  actorRole: string | null;
  action: AuditAction;
  category: AuditCategory;
  outcome: AuditOutcome;
  targetType: AuditTargetType | null;
  targetId: string | null;
  targetLabel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: AuditMetadata;
}

// Append-only by design: there is deliberately no update or delete.
export interface IAuditLogRepository {
  insert(record: IAuditRecord): Promise<void>;
  // Newest first, ordered by (occurred_at, id) so the order is total and a cursor is stable.
  // Returns at most `limit` rows that come after `cursor` (or from the start when it is null).
  findPage(
    filter: IAuditLogFilter,
    cursor: IAuditCursor | null,
    limit: number,
  ): Promise<IAuditLogEntry[]>;
  findById(id: string): Promise<IAuditLogEntry | null>;
  // min(matching rows, cap). Bounded, so asking "is this more than N?" never counts the table.
  countUpTo(filter: IAuditLogFilter, cap: number): Promise<number>;
}
