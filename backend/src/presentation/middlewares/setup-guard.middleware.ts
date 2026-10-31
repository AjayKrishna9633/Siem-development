import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

const isSetupRoute = (path: string) => path === '/api/setup' || path.startsWith('/api/setup/');

// Registered before every API route.
// - Setup pending:   only /api/setup/* works; any other API call gets 403 SETUP_REQUIRED,
//                    which the frontend turns into a redirect to /setup.
// - Setup completed: /api/setup/* answers 404 from then on.
// Paths outside /api (e.g. /health) are never blocked and never touch the database.
export function setupGuard(isSetupCompleted: () => Promise<boolean>): RequestHandler {
  // Setup can't be undone, so once it is seen completed the database isn't asked again
  let completed = false;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.path.startsWith('/api/')) return next();

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
