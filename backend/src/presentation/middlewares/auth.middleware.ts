import type { Request, Response, NextFunction } from 'express';
import type { ITokenService } from '../../application/interfaces/services/token.service.interface.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

export function authenticate(tokenService: ITokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
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

    try {
      const payload = tokenService.verifyAccessToken(token);
      req.user = payload;
      next();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        next(new AppError(AppErrorCode.TOKEN_EXPIRED, ErrorMessage.TOKEN_EXPIRED));
        return;
      }
      next(new AppError(AppErrorCode.INVALID_TOKEN, ErrorMessage.INVALID_TOKEN));
    }
  };
}
