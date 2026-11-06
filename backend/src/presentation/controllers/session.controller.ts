import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import type { ILoginUseCase } from '../../application/interfaces/use-cases/login.interface.ts';
import type { IRefreshSessionUseCase } from '../../application/interfaces/use-cases/refresh-session.interface.ts';
import type { ILogoutUseCase } from '../../application/interfaces/use-cases/logout.interface.ts';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../http/refresh-cookie.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';
import { requestContextFrom } from '../http/request-context.ts';

@injectable()
export class SessionController {
  constructor(
    @inject(TYPES.LoginUseCase) private readonly loginUseCase: ILoginUseCase,
    @inject(TYPES.RefreshSessionUseCase)
    private readonly refreshSessionUseCase: IRefreshSessionUseCase,
    @inject(TYPES.LogoutUseCase) private readonly logoutUseCase: ILogoutUseCase,
  ) {}

  login = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken, ...session } = await this.loginUseCase.execute({
      email: req.body.email,
      password: req.body.password,
      context: requestContextFrom(req),
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
    await this.logoutUseCase.execute({
      refreshToken: readRefreshCookie(req),
      context: requestContextFrom(req),
    });

    clearRefreshCookie(res);
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.LOGOUT_SUCCESSFUL));
  });
}
