import type { IActor } from '../../types/use-case/actor.types.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

// An admin demoting or disabling themselves mid-session is almost always a mistake,
// so another admin has to do it
export const assertNotSelf = (actor: IActor, userId: string): void => {
  if (actor.userId === userId) {
    throw new AppError(
      AppErrorCode.CANNOT_CHANGE_OWN_ACCESS,
      ErrorMessage.CANNOT_CHANGE_OWN_ACCESS,
    );
  }
};

// Called inside changeWithAdminLock, after the change. `activeAdminsBefore` was counted
// under the lock, so it can't be stale. Two admins demoting each other at the same
// moment both pass every earlier check; this is what stops the second one.
export const assertAnAdminRemains = (
  wasActiveAdmin: boolean,
  user: User,
  activeAdminsBefore: number,
): void => {
  if (wasActiveAdmin && !user.isActiveAdmin && activeAdminsBefore <= 1) {
    throw new AppError(AppErrorCode.LAST_ADMIN, ErrorMessage.LAST_ADMIN);
  }
};
