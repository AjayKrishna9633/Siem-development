import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IListAuditLogsUseCase } from '../../interfaces/use-cases/audit-logs.interface.ts';
import type { IListAuditLogsInput } from '../../dtos/audit/request/audit-request.dto.ts';
import type { IAuditLogPage } from '../../types/use-case/audit.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { assertPermission } from '../shared/access.ts';
import { decodeAuditCursor, encodeAuditCursor } from './audit-cursor.ts';
import { resolveAuditRange } from './audit-range.ts';

@injectable()
export class ListAuditLogsUseCase implements IListAuditLogsUseCase {
  constructor(@inject(TYPES.AuditLogRepository) private readonly _logs: IAuditLogRepository) {}

  async execute(input: IListAuditLogsInput): Promise<IAuditLogPage> {
    assertPermission(input.actor, Permission.AUDIT_VIEW);

    const { from, to } = resolveAuditRange(input.query, new Date());
    const cursor = input.cursor ? decodeAuditCursor(input.cursor) : null;

    const rows = await this._logs.findPage({ ...input.query, from, to }, cursor, input.limit + 1);
    const items = rows.slice(0, input.limit);
    const last = items.at(-1);

    return {
      items,
      nextCursor:
        rows.length > input.limit && last
          ? encodeAuditCursor({ occurredAt: last.occurredAt, id: last.id })
          : null,
    };
  }
}
