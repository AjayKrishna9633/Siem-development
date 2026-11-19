import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';
import { toIngestResultDto } from '../../application/dtos/ingest/response/ingest-response.dto.ts';
import type { IIngestEventsUseCase } from '../../application/interfaces/use-cases/ingest.interface.ts';

@injectable()
export class IngestController {
  constructor(@inject(TYPES.IngestEventsUseCase) private readonly _ingest: IIngestEventsUseCase) {}

  ingest = catchAsync(async (req: Request, res: Response): Promise<void> => {
    if (!req.ingestKey) {
      throw new AppError(AppErrorCode.INVALID_INGEST_KEY, ErrorMessage.INVALID_INGEST_KEY);
    }
    const result = await this._ingest.execute({
      key: req.ingestKey,
      events: req.body.events,
      requestId: typeof req.id === 'string' ? req.id : null,
    });
    res
      .status(HttpStatusCode.ACCEPTED)
      .json(
        new ApiResponse(
          HttpStatusCode.ACCEPTED,
          toIngestResultDto(result),
          SuccessMessage.EVENTS_STORED,
        ),
      );
  });
}
