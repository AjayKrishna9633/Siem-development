import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import {
  toCreatedIngestKeyDto,
  toIngestKeyDto,
} from '../../application/dtos/ingest-key/response/ingest-key-response.dto.ts';
import { actorFrom, idParamFrom } from '../http/actor.ts';
import type {
  ICreateIngestKeyUseCase,
  IListIngestKeysUseCase,
  IRevokeIngestKeyUseCase,
} from '../../application/interfaces/use-cases/ingest-keys.interface.ts';

@injectable()
export class IngestKeysController {
  constructor(
    @inject(TYPES.CreateIngestKeyUseCase) private readonly _create: ICreateIngestKeyUseCase,
    @inject(TYPES.ListIngestKeysUseCase) private readonly _list: IListIngestKeysUseCase,
    @inject(TYPES.RevokeIngestKeyUseCase) private readonly _revoke: IRevokeIngestKeyUseCase,
  ) {}

  list = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const keys = await this._list.execute({ actor: actorFrom(req) });
    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          keys.map(toIngestKeyDto),
          SuccessMessage.INGEST_KEYS_FETCHED,
        ),
      );
  });

  create = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const created = await this._create.execute({ actor: actorFrom(req), name: req.body.name });
    // The response holds the key itself: no proxy or browser should keep a copy.
    res.setHeader('Cache-Control', 'no-store');
    res
      .status(HttpStatusCode.CREATED)
      .json(
        new ApiResponse(
          HttpStatusCode.CREATED,
          toCreatedIngestKeyDto(created),
          SuccessMessage.INGEST_KEY_CREATED,
        ),
      );
  });

  revoke = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const key = await this._revoke.execute({ actor: actorFrom(req), id: idParamFrom(req, 'id') });
    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(HttpStatusCode.OK, toIngestKeyDto(key), SuccessMessage.INGEST_KEY_REVOKED),
      );
  });
}
