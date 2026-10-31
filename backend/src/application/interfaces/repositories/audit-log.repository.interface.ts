import type { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';

// Where a request came from, recorded with every event
export interface IRequestContext {
  ip: string | null;
  userAgent: string | null;
}

// Flat key/value detail, so entries stay easy to read and to query with jsonb operators
export type AuditMetadata = Record<string, string | number | boolean | null>;

export interface IAuditEntry {
  actorUserId: string | null;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  context: IRequestContext;
  // Extra detail; never secrets (passwords, tokens) — only what helps an investigation
  metadata?: AuditMetadata;
}

// Append-only by design: there is deliberately no update or delete
export interface IAuditLogRepository {
  append(entry: IAuditEntry): Promise<void>;
}
