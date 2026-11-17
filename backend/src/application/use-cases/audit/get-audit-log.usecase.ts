import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IGetAuditLogUseCase } from '../../interfaces/use-cases/audit-logs.interface.ts';
import type { IGetAuditLogInput } from '../../dtos/audit/request/audit-request.dto.ts';
import type { IAuditLogEntry } from '../../types/use-case/audit.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';

@injectable()
export class GetAuditLogUseCase implements IGetAuditLogUseCase {
  constructor(@inject(TYPES.AuditLogRepository) private readonly _logs: IAuditLogRepository) {}

  async execute(input: IGetAuditLogInput): Promise<IAuditLogEntry> {
    assertPermission(input.actor, Permission.AUDIT_VIEW);

    const entry = await this._logs.findById(input.id);
    if (!entry)
      throw new AppError(AppErrorCode.AUDIT_LOG_NOT_FOUND, ErrorMessage.AUDIT_LOG_NOT_FOUND);
    return entry;
  }
}
