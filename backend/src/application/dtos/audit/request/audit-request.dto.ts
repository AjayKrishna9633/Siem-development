import type { IActor } from '../../../types/use-case/actor.types.ts';
import type { AuditCategory } from '../../../../domain/enums/AuditCategory.ts';
import type { AuditOutcome } from '../../../../domain/enums/AuditOutcome.ts';

export interface IAuditLogQuery {
  from?: Date;
  to?: Date;
  actorId?: string;
  category?: AuditCategory;
  action?: string;
  outcome?: AuditOutcome;
  q?: string;
}

export interface IListAuditLogsInput {
  actor: IActor;
  query: IAuditLogQuery;
  limit: number;
  cursor?: string;
}

export interface IGetAuditLogInput {
  actor: IActor;
  id: string;
}

export interface IExportAuditLogsInput {
  actor: IActor;
  query: IAuditLogQuery;
}
