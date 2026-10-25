import type { Request } from 'express';
import { z } from 'zod';
import type { IActor } from '../../application/types/use-case/company.types.ts';
import type { UserRole } from '../../domain/enums/UserRole.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

// The signed-in user, as set by the authenticate middleware
export const actorFrom = (req: Request): IActor => {
  if (!req.user) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, ErrorMessage.UNAUTHORIZED);
  }
  return {
    userId: req.user.userId,
    role: req.user.role as UserRole,
    organizationId: req.user.organizationId,
  };
};

// Every route ID (:companyId, :userId) is a UUID. Checking here returns a clear 400
// before the database sees a malformed value and fails with a 500.
export const idParamFrom = (req: Request, name: string): string => {
  const value = req.params[name];
  if (typeof value !== 'string' || !z.uuid().safeParse(value).success) {
    throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.INVALID_ID);
  }
  return value;
};
