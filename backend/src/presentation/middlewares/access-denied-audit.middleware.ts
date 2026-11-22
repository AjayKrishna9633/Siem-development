import type { ErrorRequestHandler } from 'express';
import type { IAuditService } from '../../application/interfaces/services/audit.service.interface.ts';
import { AuditAction } from '../../domain/enums/AuditAction.ts';
import { AuditOutcome } from '../../domain/enums/AuditOutcome.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';

const PERMISSION_REFUSALS: ReadonlySet<AppErrorCode> = new Set([
  AppErrorCode.FORBIDDEN,
  AppErrorCode.CANNOT_CHANGE_OWN_ACCESS,
]);

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
