import { AUDIT_QUERY_LIMITS } from '../../../domain/constants/audit.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

const DAY_MS = 86_400_000;

export const resolveAuditRange = (
  query: { from?: Date; to?: Date },
  now: Date,
): { from: Date; to: Date } => {
  const to = query.to ?? now;
  const from =
    query.from ?? new Date(to.getTime() - AUDIT_QUERY_LIMITS.DEFAULT_RANGE_DAYS * DAY_MS);

  if (from.getTime() >= to.getTime()) {
    throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.AUDIT_RANGE_INVALID);
  }
  if (to.getTime() - from.getTime() > AUDIT_QUERY_LIMITS.MAX_RANGE_DAYS * DAY_MS) {
    throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.AUDIT_RANGE_TOO_LONG);
  }
  return { from, to };
};
