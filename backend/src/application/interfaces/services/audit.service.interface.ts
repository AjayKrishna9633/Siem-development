import type { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import type { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';
import type { AuditMetadata, IAuditActor } from '../../../domain/types/audit.types.ts';
import type { IAuditRecord } from '../repositories/audit-log.repository.interface.ts';

// What a caller says happened. Who, from where and under which request id is not the caller's
// job: AuditService reads that from the request, and the category follows from the action.
export interface IAuditEvent {
  action: AuditAction;
  // Defaults to success.
  outcome?: AuditOutcome;
  // Omit to use whoever the request is authenticated as. Pass it when that isn't the right
  // answer: a login (nobody is authenticated yet) or a CLI command (SYSTEM_ACTOR).
  actor?: IAuditActor | null;
  targetType?: AuditTargetType;
  targetId?: string | null;
  targetLabel?: string | null;
  metadata?: AuditMetadata;
}

export interface IAuditService {
  // The one way to write an audit row. Never throws: a broken audit write is logged and the
  // request carries on, because a logging fault must not take the product down.
  record(event: IAuditEvent): Promise<void>;
  // Builds the row without writing it, for the few events that must commit or roll back with
  // the change they describe (role and status changes). The caller persists it in its own
  // transaction, so a failure there is allowed to fail the change.
  prepare(event: IAuditEvent): IAuditRecord;
}
