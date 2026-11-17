import type { ErrorRequestHandler } from 'express';
import type { IAuditService } from '../../application/interfaces/services/audit.service.interface.ts';
import { AuditAction } from '../../domain/enums/AuditAction.ts';
import { AuditOutcome } from '../../domain/enums/AuditOutcome.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';

// Only refusals of a signed-in user's permission. SETUP_REQUIRED and ACCOUNT_INACTIVE are also 403s
// but are not "this user tried something they may not do", and a disabled account or a server
// still in setup would otherwise bury the log in noise.
const PERMISSION_REFUSALS: ReadonlySet<AppErrorCode> = new Set([
  AppErrorCode.FORBIDDEN,
  AppErrorCode.CANNOT_CHANGE_OWN_ACCESS,
]);

// Sits just before errorHandler, records the refusal, and passes the same error on untouched, so
// the response the client sees is unchanged.
export const auditAccessDenied =
  (audit: IAuditService): ErrorRequestHandler =>
  async (err, req, _res, next) => {
    if (err instanceof AppError && PERMISSION_REFUSALS.has(err.code) && req.user) {
      await audit.record({
        action: AuditAction.ACCESS_DENIED,
        outcome: AuditOutcome.DENIED,
        metadata: {
          method: req.method,
          // Path only: a query string could carry a token.
          path: req.originalUrl.split('?')[0] ?? '',
          code: err.code,
        },
      });
    }
    next(err);
  };
