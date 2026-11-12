import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catch-async.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { SuccessMessage } from '../../domain/enums/SuccessMessage.ts';
import { toSessionResponse } from '../../application/dtos/session/response/session-response.dto.ts';
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
    @inject(TYPES.LoginUseCase) private readonly _loginUseCase: ILoginUseCase,
    @inject(TYPES.RefreshSessionUseCase)
    private readonly _refreshSessionUseCase: IRefreshSessionUseCase,
    @inject(TYPES.LogoutUseCase) private readonly _logoutUseCase: ILogoutUseCase,
  ) {}

  login = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const session = await this._loginUseCase.execute({
      email: req.body.email,
      password: req.body.password,
      context: requestContextFrom(req),
    });

    setRefreshCookie(res, session.refreshToken);
    res
      .status(HttpStatusCode.OK)
      .json(
        new ApiResponse(
          HttpStatusCode.OK,
          toSessionResponse(session),
          SuccessMessage.LOGIN_SUCCESSFUL,
        ),
      );
  });

  refresh = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const token = readRefreshCookie(req);
    if (!token) {
      throw new AppError(AppErrorCode.INVALID_REFRESH_TOKEN, ErrorMessage.INVALID_REFRESH_TOKEN);
    }

    try {
      const session = await this._refreshSessionUseCase.execute({
        refreshToken: token,
      });
      setRefreshCookie(res, session.refreshToken);
      res
        .status(HttpStatusCode.OK)
        .json(
          new ApiResponse(
            HttpStatusCode.OK,
            toSessionResponse(session),
            SuccessMessage.SESSION_REFRESHED,
          ),
        );
    } catch (err) {
      clearRefreshCookie(res);
      throw err;
    }
  });

  logout = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this._logoutUseCase.execute({
      refreshToken: readRefreshCookie(req),
      context: requestContextFrom(req),
    });

    clearRefreshCookie(res);
    res
      .status(HttpStatusCode.OK)
      .json(new ApiResponse(HttpStatusCode.OK, null, SuccessMessage.LOGOUT_SUCCESSFUL));
  });
}
