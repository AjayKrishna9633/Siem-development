import type { IAuditRecord } from '../../../application/interfaces/repositories/audit-log.repository.interface.ts';
import type { AuditLogModel } from '../models/audit-log.model.ts';

// id and occurred_at are left out on purpose: the database assigns both, so neither a caller nor a
// bug can choose a row's id or backdate it.
export const toAuditRow = (record: IAuditRecord): Omit<AuditLogModel, 'id' | 'occurredAt'> => ({
  actorId: record.actorId,
  actorUsername: record.actorUsername,
  actorRole: record.actorRole,
  action: record.action,
  category: record.category,
  outcome: record.outcome,
  targetType: record.targetType,
  targetId: record.targetId,
  targetLabel: record.targetLabel,
  ipAddress: record.ipAddress,
  userAgent: record.userAgent,
  requestId: record.requestId,
  metadata: record.metadata,
});
