import type { IActor } from '../../types/use-case/actor.types.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

export const assertNotSelf = (actor: IActor, userId: string): void => {
  if (actor.userId === userId) {
    throw new AppError(
      AppErrorCode.CANNOT_CHANGE_OWN_ACCESS,
      ErrorMessage.CANNOT_CHANGE_OWN_ACCESS,
    );
  }
};

export const assertAnAdminRemains = (
  wasActiveAdmin: boolean,
  user: User,
  activeAdminsBefore: number,
): void => {
  if (wasActiveAdmin && !user.isActiveAdmin && activeAdminsBefore <= 1) {
    throw new AppError(AppErrorCode.LAST_ADMIN, ErrorMessage.LAST_ADMIN);
  }
};
