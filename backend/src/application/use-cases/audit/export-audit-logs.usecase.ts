import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import { AUDIT_QUERY_LIMITS } from '../../../domain/constants/audit.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IExportAuditLogsUseCase } from '../../interfaces/use-cases/audit-logs.interface.ts';
import type { IExportAuditLogsInput } from '../../dtos/audit/request/audit-request.dto.ts';
import type {
  IAuditCursor,
  IAuditLogEntry,
  IAuditLogExport,
  IAuditLogFilter,
} from '../../types/use-case/audit.types.ts';
import type { AuditMetadata } from '../../../domain/types/audit.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AuditAction } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';
import { resolveAuditRange } from './audit-range.ts';

@injectable()
export class ExportAuditLogsUseCase implements IExportAuditLogsUseCase {
  constructor(
    @inject(TYPES.AuditLogRepository) private readonly _logs: IAuditLogRepository,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
  ) {}

  async execute(input: IExportAuditLogsInput): Promise<IAuditLogExport> {
    assertPermission(input.actor, Permission.AUDIT_VIEW);

    const { from, to } = resolveAuditRange(input.query, new Date());
    const filter: IAuditLogFilter = { ...input.query, from, to };

    // Refuse up front: once the first byte of a CSV is sent the status code can't change, so an
    // oversized export must be caught before streaming starts, not by cutting it short.
    const rowCount = await this._logs.countUpTo(filter, AUDIT_QUERY_LIMITS.EXPORT_MAX_ROWS + 1);
    if (rowCount > AUDIT_QUERY_LIMITS.EXPORT_MAX_ROWS) {
      throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.AUDIT_EXPORT_TOO_LARGE);
    }

    // Written before any data leaves, so an export that is interrupted halfway is still on record.
    await this._audit.record({
      action: AuditAction.AUDIT_EXPORTED,
      metadata: exportMetadata(filter, rowCount),
    });

    return { rowCount, rows: this.stream(filter) };
  }

  // Walks the same keyset the paged API uses, a batch at a time, so memory stays flat however
  // large the export is.
  private async *stream(filter: IAuditLogFilter): AsyncGenerator<IAuditLogEntry> {
    let cursor: IAuditCursor | null = null;
    let sent = 0;

    while (sent < AUDIT_QUERY_LIMITS.EXPORT_MAX_ROWS) {
      const batch = await this._logs.findPage(filter, cursor, AUDIT_QUERY_LIMITS.EXPORT_BATCH_SIZE);
      for (const entry of batch) {
        yield entry;
        sent += 1;
      }

      const last = batch.at(-1);
      if (!last || batch.length < AUDIT_QUERY_LIMITS.EXPORT_BATCH_SIZE) return;
      cursor = { occurredAt: last.occurredAt, id: last.id };
    }
  }
}

// What was exported, so a reviewer can tell an export of one day's logins from the whole log.
// Only the filters that were actually set appear (metadata can't hold undefined).
const exportMetadata = (filter: IAuditLogFilter, rowCount: number): AuditMetadata => ({
  format: 'csv',
  rowCount,
  from: filter.from.toISOString(),
  to: filter.to.toISOString(),
  ...(filter.actorId && { actorId: filter.actorId }),
  ...(filter.category && { category: filter.category }),
  ...(filter.action && { action: filter.action }),
  ...(filter.outcome && { outcome: filter.outcome }),
  ...(filter.q && { q: filter.q }),
});
