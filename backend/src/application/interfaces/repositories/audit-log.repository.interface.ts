import type { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';

export interface IRequestContext {
  ip: string | null;
  userAgent: string | null;
}

export type AuditMetadata = Record<string, string | number | boolean | null>;

export interface IAuditEntry {
  actorUserId: string | null;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  context: IRequestContext;
  metadata?: AuditMetadata;
}

export interface IAuditLogRepository {
  append(entry: IAuditEntry): Promise<void>;
}
