import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

export const loadActiveUser = async (users: IUserRepository, userId: string): Promise<User> => {
  const user = await users.findById(userId);
  if (!user) throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
  if (user.status !== UserStatus.ACTIVE || !user.passwordHash) {
    throw new AppError(AppErrorCode.ACCOUNT_INACTIVE, ErrorMessage.ACCOUNT_INACTIVE);
  }
  return user;
};

export const invalidCode = () =>
  new AppError(AppErrorCode.INVALID_VERIFICATION_CODE, ErrorMessage.INVALID_VERIFICATION_CODE);
