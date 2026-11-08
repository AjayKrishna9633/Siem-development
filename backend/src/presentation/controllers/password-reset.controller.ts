import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { toPasswordResetPreviewDto } from '../dtos/password-reset.dto.ts';
import { requestContextFrom } from '../http/request-context.ts';
import { LINK_TOKEN_PATTERN } from '../validators/common.schema.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';
import type {
  IGetPasswordResetUseCase,
  IRequestPasswordResetUseCase,
  IResetPasswordUseCase,
} from '../../application/interfaces/use-cases/password-reset.interface.ts';

@injectable()
export class PasswordResetController {
  constructor(
    @inject(TYPES.RequestPasswordResetUseCase)
    private readonly requestPasswordReset: IRequestPasswordResetUseCase,
    @inject(TYPES.GetPasswordResetUseCase)
    private readonly getPasswordReset: IGetPasswordResetUseCase,
    @inject(TYPES.ResetPasswordUseCase) private readonly resetPassword: IResetPasswordUseCase,
  ) {}

  request = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.requestPasswordReset.execute({
      email: req.body.email,
      context: requestContextFrom(req),
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.PASSWORD_RESET_REQUESTED));
  });

  preview = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const token = typeof req.query.token === 'string' ? req.query.token.trim().toLowerCase() : '';
    if (!LINK_TOKEN_PATTERN.test(token)) {
      throw new AppError(AppErrorCode.INVALID_RESET_LINK, ErrorMessage.INVALID_RESET_LINK);
    }

    const result = await this.getPasswordReset.execute({ token });
    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toPasswordResetPreviewDto(result),
          SuccessMessage.PASSWORD_RESET_FETCHED,
        ),
      );
  });

  reset = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.resetPassword.execute({
      token: req.body.token,
      password: req.body.password,
      context: requestContextFrom(req),
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.PASSWORD_RESET_SUCCESSFUL));
  });
}
