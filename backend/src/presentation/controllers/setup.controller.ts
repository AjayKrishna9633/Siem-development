import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { setRefreshCookie } from '../http/refresh-cookie.ts';
import { requestContextFrom } from '../http/request-context.ts';
import type {
  ICompleteSetupUseCase,
  IVerifySetupTokenUseCase,
} from '../../application/interfaces/use-cases/setup.interface.ts';

@injectable()
export class SetupController {
  constructor(
    @inject(TYPES.VerifySetupTokenUseCase)
    private readonly verifySetupToken: IVerifySetupTokenUseCase,
    @inject(TYPES.CompleteSetupUseCase) private readonly completeSetup: ICompleteSetupUseCase,
  ) {}

  verifyToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.verifySetupToken.execute({
      token: req.body.token,
      context: requestContextFrom(req),
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.SETUP_TOKEN_VALID));
  });

  complete = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken, ...session } = await this.completeSetup.execute({
      token: req.body.token,
      adminName: req.body.adminName,
      email: req.body.email,
      password: req.body.password,
      orgName: req.body.orgName,
      baseUrl: req.body.baseUrl,
      timezone: req.body.timezone,
      context: requestContextFrom(req),
    });

    setRefreshCookie(res, refreshToken);
    res
      .status(HttpStatusCode.CREATED)
      .json(new ApiResponse(HttpStatusCode.CREATED, session, SuccessMessage.SETUP_COMPLETED));
  });
}
