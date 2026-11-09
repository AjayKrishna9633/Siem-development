import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { toSessionResponse } from '../../application/dtos/session/response/session-response.dto.ts';
import { toUserProfileDto } from '../../application/dtos/user/response/user-response.dto.ts';
import { toCodeSentDto } from '../../application/dtos/account/response/account-response.dto.ts';
import type { IGetCurrentUserUseCase } from '../../application/interfaces/use-cases/get-current-user.interface.ts';
import type { IUpdateProfileUseCase } from '../../application/interfaces/use-cases/update-profile.interface.ts';
import type {
  IChangeEmailUseCase,
  IChangePasswordUseCase,
  IRequestEmailChangeUseCase,
} from '../../application/interfaces/use-cases/account.interface.ts';
import { actorFrom } from '../http/actor.ts';
import { setRefreshCookie } from '../http/refresh-cookie.ts';
import { requestContextFrom } from '../http/request-context.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

@injectable()
export class AccountController {
  constructor(
    @inject(TYPES.GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: IGetCurrentUserUseCase,
    @inject(TYPES.UpdateProfileUseCase)
    private readonly updateProfileUseCase: IUpdateProfileUseCase,
    @inject(TYPES.ChangePasswordUseCase)
    private readonly changePasswordUseCase: IChangePasswordUseCase,
    @inject(TYPES.RequestEmailChangeUseCase)
    private readonly requestEmailChangeUseCase: IRequestEmailChangeUseCase,
    @inject(TYPES.ChangeEmailUseCase)
    private readonly changeEmailUseCase: IChangeEmailUseCase,
  ) {}

  getMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError(AppErrorCode.UNAUTHORIZED, ErrorMessage.UNAUTHORIZED);
    }

    const profile = await this.getCurrentUserUseCase.execute({
      userId: req.user.userId,
      tokenVersion: req.user.tokenVersion,
    });

    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toUserProfileDto(profile),
          SuccessMessage.USER_PROFILE_FETCHED,
        ),
      );
  });

  updateProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const updatedProfile = await this.updateProfileUseCase.execute({
      id: actorFrom(req).userId,
      username: req.body.username,
      now: new Date(),
    });

    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toUserProfileDto(updatedProfile),
          SuccessMessage.PROFILE_UPDATED,
        ),
      );
  });

  changePassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const session = await this.changePasswordUseCase.execute({
      actor: actorFrom(req),
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
      context: requestContextFrom(req),
    });

    setRefreshCookie(res, session.refreshToken);
    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toSessionResponse(session),
          SuccessMessage.PASSWORD_CHANGED,
        ),
      );
  });

  requestEmailChange = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.requestEmailChangeUseCase.execute({
      actor: actorFrom(req),
      newEmail: req.body.newEmail,
      currentPassword: req.body.currentPassword,
    });

    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toCodeSentDto(result),
          SuccessMessage.VERIFICATION_CODE_SENT,
        ),
      );
  });

  changeEmail = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const session = await this.changeEmailUseCase.execute({
      actor: actorFrom(req),
      code: req.body.code,
    });

    setRefreshCookie(res, session.refreshToken);
    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toSessionResponse(session),
          SuccessMessage.EMAIL_CHANGED,
        ),
      );
  });
}
