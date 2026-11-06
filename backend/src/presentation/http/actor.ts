import type { Request } from 'express';
import { z } from 'zod';
import type { IActor } from '../../application/types/use-case/actor.types.ts';
import type { UserRole } from '../../domain/enums/UserRole.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

export const actorFrom = (req: Request): IActor => {
  if (!req.user) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, ErrorMessage.UNAUTHORIZED);
  }
  return {
    userId: req.user.userId,
    role: req.user.role as UserRole,
  };
};

export const idParamFrom = (req: Request, name: string): string => {
  const value = req.params[name];
  if (typeof value !== 'string' || !z.uuid().safeParse(value).success) {
    throw new AppError(AppErrorCode.VALIDATION_ERROR, ErrorMessage.INVALID_ID);
  }
  return value;
};
