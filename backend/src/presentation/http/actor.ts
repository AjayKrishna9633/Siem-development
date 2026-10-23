import type { Request } from 'express';
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

export const paramFrom = (req: Request, name: string): string => {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.VALIDATION_ERROR);
  }
  return value;
};
