import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import type { ISendOtpUseCase } from '../../application/interfaces/use-cases/send-otp.interface.ts';
import type { IVerifyOtpUseCase } from '../../application/interfaces/use-cases/verify-otp.interface.ts';
import type { ILoginUseCase } from '../../application/interfaces/use-cases/login.interface.ts';
import type { IGetCurrentUserUseCase } from '../../application/interfaces/use-cases/get-current-user.interface.ts';
import type { IResetPasswordUseCase } from '../../application/interfaces/use-cases/reset-password.interface.ts';
import type { IUpdateProfileUseCase } from '../../application/interfaces/use-cases/update-profile.interface.ts';
import type {
  IActivateAccountUseCase,
  IGetActivationUseCase,
} from '../../application/interfaces/use-cases/activation.interface.ts';
import type { IRefreshSessionUseCase } from '../../application/interfaces/use-cases/refresh-session.interface.ts';
import type { ILogoutUseCase } from '../../application/interfaces/use-cases/logout.interface.ts';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../http/refresh-cookie.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.SendOtpUseCase) private readonly sendOtpUseCase: ISendOtpUseCase,
    @inject(TYPES.VerifyOtpUseCase) private readonly verifyOtpUseCase: IVerifyOtpUseCase,
    @inject(TYPES.LoginUseCase) private readonly loginUseCase: ILoginUseCase,
    @inject(TYPES.GetCurrentUserUseCase)
    private readonly getCurrentUserUseCase: IGetCurrentUserUseCase,
    @inject(TYPES.ResetPasswordUseCase)
    private readonly resetPasswordUseCase: IResetPasswordUseCase,
    @inject(TYPES.UpdateProfileUseCase)
    private readonly updateProfileUseCase: IUpdateProfileUseCase,
    @inject(TYPES.GetActivationUseCase)
    private readonly getActivationUseCase: IGetActivationUseCase,
    @inject(TYPES.ActivateAccountUseCase)
    private readonly activateAccountUseCase: IActivateAccountUseCase,
    @inject(TYPES.RefreshSessionUseCase)
    private readonly refreshSessionUseCase: IRefreshSessionUseCase,
    @inject(TYPES.LogoutUseCase)
    private readonly logoutUseCase: ILogoutUseCase,
  ) {}

  sendOtp = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.sendOtpUseCase.execute(req.body);

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.OTP_SENT));
  });

  verifyOtp = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const result = await this.verifyOtpUseCase.execute(req.body);

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.OTP_VERIFIED));
  });

  login = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const forwardedHeader = req.headers['x-forwarded-for'];
    const ip =
      typeof forwardedHeader === 'string'
        ? (forwardedHeader.split(',')[0]?.trim() ?? req.ip ?? null)
        : (req.ip ?? null);

    const { refreshToken, ...session } = await this.loginUseCase.execute({
      ...req.body,
      ip,
    });

    setRefreshCookie(res, refreshToken);
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, session, SuccessMessage.LOGIN_SUCCESSFUL));
  });

  refresh = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const token = readRefreshCookie(req);
    if (!token) {
      throw new AppError(AppErrorCode.INVALID_REFRESH_TOKEN, ErrorMessage.INVALID_REFRESH_TOKEN);
    }

    try {
      const { refreshToken, ...session } = await this.refreshSessionUseCase.execute({
        refreshToken: token,
      });
      setRefreshCookie(res, refreshToken);
      res
        .status(HttpStatusCode.OK)
        .json(new ApiResponse(HttpStatusCode.OK, session, SuccessMessage.SESSION_REFRESHED));
    } catch (err) {
      clearRefreshCookie(res);
      throw err;
    }
  });

  logout = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.logoutUseCase.execute({ refreshToken: readRefreshCookie(req) });

    clearRefreshCookie(res);
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.LOGOUT_SUCCESSFUL));
  });

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
      .json(new ApiResponse(HttpStatusCode.OK, profile, SuccessMessage.USER_PROFILE_FETCHED));
  });

  resetPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.resetPasswordUseCase.execute(req.body);

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.PASSWORD_RESET_SUCCESSFUL));
  });

  updateProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError(AppErrorCode.UNAUTHORIZED, ErrorMessage.UNAUTHORIZED);
    }

    const updatedProfile = await this.updateProfileUseCase.execute({
      id: req.user.userId,
      username: req.body.username,
      now: new Date(),
    });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, updatedProfile, SuccessMessage.PROFILE_UPDATED));
  });

  getActivation = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const activationId = typeof req.query.id === 'string' ? req.query.id : '';
    if (!activationId) {
      throw new AppError(AppErrorCode.INVALID_ACTIVATION, ErrorMessage.INVALID_ACTIVATION);
    }

    const result = await this.getActivationUseCase.execute({ activationId });

    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, result, SuccessMessage.ACTIVATION_FETCHED));
  });

  activate = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken, ...session } = await this.activateAccountUseCase.execute(req.body);

    setRefreshCookie(res, refreshToken);
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, session, SuccessMessage.ACCOUNT_ACTIVATED));
  });
}
