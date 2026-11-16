import type { IAuditLogEntry, IAuditLogPage } from '../../../types/use-case/audit.types.ts';
import type { AuditMetadata } from '../../../../domain/types/audit.types.ts';

export interface IAuditLogDto {
  id: string;
  occurredAt: string;
  // userId is null for the system itself and for anonymous events such as a failed login.
  actor: { id: string | null; username: string | null; role: string | null };
  action: string;
  category: string;
  outcome: string;
  target: { type: string | null; id: string | null; label: string | null };
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: AuditMetadata;
}

export interface IAuditLogPageDto {
  items: IAuditLogDto[];
  nextCursor: string | null;
}

export const toAuditLogDto = (entry: IAuditLogEntry): IAuditLogDto => ({
  id: entry.id,
  occurredAt: entry.occurredAt,
  actor: { id: entry.actorId, username: entry.actorUsername, role: entry.actorRole },
  action: entry.action,
  category: entry.category,
  outcome: entry.outcome,
  target: { type: entry.targetType, id: entry.targetId, label: entry.targetLabel },
  ipAddress: entry.ipAddress,
  userAgent: entry.userAgent,
  requestId: entry.requestId,
  metadata: entry.metadata,
});

export const toAuditLogPageDto = (page: IAuditLogPage): IAuditLogPageDto => ({
  items: page.items.map(toAuditLogDto),
  nextCursor: page.nextCursor,
});
