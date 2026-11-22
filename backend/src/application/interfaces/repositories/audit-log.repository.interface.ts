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

// Append-only: no update or delete.
export interface IAuditLogRepository {
  insert(record: IAuditRecord): Promise<void>;
  findPage(
    filter: IAuditLogFilter,
    cursor: IAuditCursor | null,
    limit: number,
  ): Promise<IAuditLogEntry[]>;
  findById(id: string): Promise<IAuditLogEntry | null>;
  countUpTo(filter: IAuditLogFilter, cap: number): Promise<number>;
}
