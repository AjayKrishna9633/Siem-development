import type { IActor } from '../../types/use-case/actor.types.ts';
import type { Permission } from '../../../domain/enums/Permission.ts';
import { hasPermission } from '../../../domain/policies/permissions.policy.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { PASSWORD_MIN_LENGTH } from '../../../domain/policies/credentials.policy.ts';

export const assertPermission = (actor: IActor, permission: Permission): void => {
  if (!hasPermission(actor.role, permission)) {
    throw new AppError(AppErrorCode.FORBIDDEN, ErrorMessage.FORBIDDEN);
  }
};

export const assertPasswordPolicy = (newPassword: string): void => {
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    throw new AppError(
      AppErrorCode.VALIDATION_ERROR,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  }
};
