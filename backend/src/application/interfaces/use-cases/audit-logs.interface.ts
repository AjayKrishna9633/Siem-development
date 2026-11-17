import type {
  IExportAuditLogsInput,
  IGetAuditLogInput,
  IListAuditLogsInput,
} from '../../dtos/audit/request/audit-request.dto.ts';
import type {
  IAuditLogEntry,
  IAuditLogExport,
  IAuditLogPage,
} from '../../types/use-case/audit.types.ts';

export interface IListAuditLogsUseCase {
  execute(input: IListAuditLogsInput): Promise<IAuditLogPage>;
}

export interface IGetAuditLogUseCase {
  execute(input: IGetAuditLogInput): Promise<IAuditLogEntry>;
}

export interface IExportAuditLogsUseCase {
  execute(input: IExportAuditLogsInput): Promise<IAuditLogExport>;
}
