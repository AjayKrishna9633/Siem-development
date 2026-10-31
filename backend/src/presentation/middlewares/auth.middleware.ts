import type { Request, Response, NextFunction } from 'express';
import type {
  ITokenPayload,
  ITokenService,
} from '../../application/interfaces/services/token.service.interface.ts';
import type { IResolveSessionUserUseCase } from '../../application/interfaces/use-cases/resolve-session-user.interface.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

import type { Permission } from '../../domain/enums/Permission.ts';
import type { UserRole } from '../../domain/enums/UserRole.ts';
import { hasPermission } from '../../domain/policies/permissions.policy.ts';

// Verifies the access token, then loads the user so a disabled account or changed
// role takes effect on the next request rather than when the token expires
export function authenticate(
  tokenService: ITokenService,
  sessionUsers: IResolveSessionUserUseCase,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next(new AppError(AppErrorCode.UNAUTHORIZED, ErrorMessage.UNAUTHORIZED));
      return;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      next(new AppError(AppErrorCode.UNAUTHORIZED, ErrorMessage.UNAUTHORIZED));
      return;
    }

    let payload: ITokenPayload;
    try {
      payload = tokenService.verifyAccessToken(token);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        next(new AppError(AppErrorCode.TOKEN_EXPIRED, ErrorMessage.TOKEN_EXPIRED));
        return;
      }
      next(new AppError(AppErrorCode.INVALID_TOKEN, ErrorMessage.INVALID_TOKEN));
      return;
    }

    try {
      req.user = await sessionUsers.execute({
        userId: payload.userId,
        tokenVersion: payload.tokenVersion,
      });
      next();
    } catch (err: unknown) {
      next(err);
    }
  };
}

// Every listed permission is required. Runs after `authenticate`.
export function authorize(...required: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(AppErrorCode.UNAUTHORIZED, ErrorMessage.UNAUTHORIZED));
      return;
    }

    const role = req.user.role as UserRole;
    if (!required.every((permission) => hasPermission(role, permission))) {
      next(new AppError(AppErrorCode.FORBIDDEN, ErrorMessage.FORBIDDEN));
      return;
    }

    next();
  };
}
