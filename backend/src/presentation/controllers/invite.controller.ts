import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { setRefreshCookie } from '../http/refresh-cookie.ts';
import { requestContextFrom } from '../http/request-context.ts';
import { LINK_TOKEN_PATTERN } from '../validators/common.schema.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';
import type {
  IAcceptInviteUseCase,
  IGetInviteUseCase,
} from '../../application/interfaces/use-cases/invites.interface.ts';

// The invited person's side: open the link, then accept. No sign-in needed — the
// single-use link is the credential.
@injectable()
export class InviteController {
  constructor(
    @inject(TYPES.GetInviteUseCase) private readonly getInvite: IGetInviteUseCase,
    @inject(TYPES.AcceptInviteUseCase) private readonly acceptInvite: IAcceptInviteUseCase,
  ) {}

  preview = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const token = typeof req.query.token === 'string' ? req.query.token.trim().toLowerCase() : '';
    // A mangled link is rejected before any lookup
    if (!LINK_TOKEN_PATTERN.test(token)) {
      throw new AppError(AppErrorCode.INVALID_INVITE, ErrorMessage.INVALID_INVITE);
    }

    const result = await this.getInvite.execute({ token });
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.INVITE_FETCHED));
  });

  accept = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken, ...session } = await this.acceptInvite.execute({
      token: req.body.token,
      name: req.body.name,
      password: req.body.password,
      context: requestContextFrom(req),
    });

    setRefreshCookie(res, refreshToken);
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, session, SuccessMessage.INVITE_ACCEPTED));
  });
}
