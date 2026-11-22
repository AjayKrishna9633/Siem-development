import { injectable, inject } from 'inversify';
import { once } from 'node:events';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import {
  toAuditLogDto,
  toAuditLogPageDto,
} from '../../application/dtos/audit/response/audit-response.dto.ts';
import { actorFrom, idParamFrom } from '../http/actor.ts';
import { AUDIT_CSV_HEADER, auditCsvRow, csvLine } from '../http/audit-csv.ts';
import {
  exportAuditLogsQuerySchema,
  listAuditLogsQuerySchema,
} from '../validators/audit.schema.ts';
import type {
  IExportAuditLogsUseCase,
  IGetAuditLogUseCase,
  IListAuditLogsUseCase,
} from '../../application/interfaces/use-cases/audit-logs.interface.ts';

// BOM, so spreadsheets read UTF-8.
const UTF8_BOM = '﻿';

const exportFilename = (now: Date): string =>
  `audit-logs-${now.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')}.csv`;

@injectable()
export class AuditLogsController {
  constructor(
    @inject(TYPES.ListAuditLogsUseCase) private readonly _list: IListAuditLogsUseCase,
    @inject(TYPES.GetAuditLogUseCase) private readonly _get: IGetAuditLogUseCase,
    @inject(TYPES.ExportAuditLogsUseCase) private readonly _export: IExportAuditLogsUseCase,
  ) {}

  list = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { limit, cursor, ...query } = listAuditLogsQuerySchema.parse(req.query);
    const page = await this._list.execute({ actor: actorFrom(req), query, limit, cursor });

    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toAuditLogPageDto(page),
          SuccessMessage.AUDIT_LOGS_FETCHED,
        ),
      );
  });

  get = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const entry = await this._get.execute({
      actor: actorFrom(req),
      id: idParamFrom(req, 'id'),
    });

    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(HttpStatusCode.OK, toAuditLogDto(entry), SuccessMessage.AUDIT_LOG_FETCHED),
      );
  });

  export = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { from, to, actorId, category, outcome, action, q } = exportAuditLogsQuerySchema.parse(
      req.query,
    );
    const { rows } = await this._export.execute({
      actor: actorFrom(req),
      query: { from, to, actorId, category, outcome, action, q },
    });

    res.status(HttpStatusCode.OK);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(new Date())}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.write(UTF8_BOM + csvLine(AUDIT_CSV_HEADER));

    try {
      for await (const entry of rows) {
        if (res.destroyed) return;
        if (!res.write(auditCsvRow(entry))) {
          await Promise.race([once(res, 'drain'), once(res, 'close')]);
        }
      }
      res.end();
    } catch (err: unknown) {
      // Headers already sent: drop the connection so the download fails visibly.
      req.log.error({ err }, 'Audit export failed part-way');
      res.destroy();
    }
  });
}
