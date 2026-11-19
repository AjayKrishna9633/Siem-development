import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

const isSetupRoute = (path: string) => path === '/api/setup' || path.startsWith('/api/setup/');

// Docker and the installer poll this before anyone has finished setup, so it must answer then.
const isHealthRoute = (path: string) => path === '/api/health';

export function setupGuard(isSetupCompleted: () => Promise<boolean>): RequestHandler {
  let completed = false;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.path.startsWith('/api/') || isHealthRoute(req.path)) return next();

    try {
      if (!completed) completed = await isSetupCompleted();
    } catch (err) {
      return next(err);
    }

    if (completed) {
      if (isSetupRoute(req.path)) {
        return next(
          new AppError(AppErrorCode.SETUP_ALREADY_COMPLETED, ErrorMessage.ROUTE_NOT_FOUND),
        );
      }
      return next();
    }

    if (isSetupRoute(req.path)) return next();
    next(new AppError(AppErrorCode.SETUP_REQUIRED, ErrorMessage.SETUP_REQUIRED));
  };
}
