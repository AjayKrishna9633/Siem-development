import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import type {
  IActivateAccountUseCase,
  IGetActivationUseCase,
  IVerifyActivationUseCase,
} from '../../application/interfaces/use-cases/activation.interface.ts';
import { ACTIVATION_ID_PATTERN } from '../../application/interfaces/services/activation.service.interface.ts';
import { setRefreshCookie } from '../http/refresh-cookie.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

// A newly added person activating their account, via the link or the temporary password
@injectable()
export class ActivationController {
  constructor(
    @inject(TYPES.GetActivationUseCase)
    private readonly getActivationUseCase: IGetActivationUseCase,
    @inject(TYPES.VerifyActivationUseCase)
    private readonly verifyActivationUseCase: IVerifyActivationUseCase,
    @inject(TYPES.ActivateAccountUseCase)
    private readonly activateAccountUseCase: IActivateAccountUseCase,
  ) {}

  getActivation = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const activationId = typeof req.query.id === 'string' ? req.query.id : '';
    if (!ACTIVATION_ID_PATTERN.test(activationId)) {
      throw new AppError(AppErrorCode.INVALID_ACTIVATION, ErrorMessage.INVALID_ACTIVATION);
    }

    const result = await this.getActivationUseCase.execute({ activationId });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.ACTIVATION_FETCHED));
  });

  verifyActivation = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.verifyActivationUseCase.execute({
      email: req.body.email,
      temporaryPassword: req.body.temporaryPassword,
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.ACTIVATION_VERIFIED));
  });

  activate = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken, ...session } = await this.activateAccountUseCase.execute({
      activationId: req.body.activationId,
      newPassword: req.body.newPassword,
    });

    setRefreshCookie(res, refreshToken);
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, session, SuccessMessage.ACCOUNT_ACTIVATED));
  });
}
