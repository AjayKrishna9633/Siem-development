import type { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import type { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';
import type { AuditMetadata, IAuditActor } from '../../../domain/types/audit.types.ts';
import type { IAuditRecord } from '../repositories/audit-log.repository.interface.ts';

export interface IAuditEvent {
  action: AuditAction;
  outcome?: AuditOutcome;
  actor?: IAuditActor | null;
  targetType?: AuditTargetType;
  targetId?: string | null;
  targetLabel?: string | null;
  metadata?: AuditMetadata;
}

export interface IAuditService {
  // Never throws: a failed audit write is logged, not fatal.
  record(event: IAuditEvent): Promise<void>;
  prepare(event: IAuditEvent): IAuditRecord;
}
