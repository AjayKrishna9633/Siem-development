import type { IIngestKeyRecord } from '../../interfaces/repositories/ingest-key.repository.interface.ts';
import type { IIngestKey } from '../../types/use-case/ingest-key.types.ts';
import type { IActor } from '../../types/use-case/actor.types.ts';
import type { IAuditActor } from '../../../domain/types/audit.types.ts';
import { SYSTEM_ACTOR } from '../../../domain/constants/audit.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { assertPermission } from '../shared/access.ts';

export const toIngestKey = (record: IIngestKeyRecord): IIngestKey => ({
  ...record,
  active: record.revokedAt === null,
});

// A signed-in caller needs the permission; the server command (null) is trusted.
export const assertCanManageIngestKeys = (actor: IActor | null): void => {
  if (actor) assertPermission(actor, Permission.INGEST_MANAGE);
};

// undefined lets AuditService name the signed-in user from the request.
export const ingestAuditActor = (actor: IActor | null): IAuditActor | undefined =>
  actor ? undefined : SYSTEM_ACTOR;
