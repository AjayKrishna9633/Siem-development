import type { IAuditRecord } from '../../../application/interfaces/repositories/audit-log.repository.interface.ts';
import type { AuditLogModel } from '../models/audit-log.model.ts';

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
