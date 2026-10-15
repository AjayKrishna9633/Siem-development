import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type {
  IGetCurrentUserInput,
  IGetCurrentUserUseCase,
} from '../../interfaces/use-cases/get-current-user.interface.ts';
import type { IUserProfileResponse } from '../../types/use-case/auth.types.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

@injectable()
export class GetCurrentUserUseCase implements IGetCurrentUserUseCase {
  constructor(@inject(TYPES.UserRepository) private readonly users: IUserRepository) {}

  async execute(input: IGetCurrentUserInput): Promise<IUserProfileResponse> {
    const user = await this.users.findById(input.userId);

    if (!user) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(AppErrorCode.ACCOUNT_INACTIVE, ErrorMessage.ACCOUNT_INACTIVE);
    }

    if (user.tokenVersion !== input.tokenVersion) {
      throw new AppError(AppErrorCode.TOKEN_EXPIRED, ErrorMessage.TOKEN_EXPIRED);
    }

    const snapshot = user.toSnapshot();

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
      isEmailVerified: snapshot.isEmailVerified,
      lastLoginAt: snapshot.lastLoginAt,
      createdAt: snapshot.createdAt,
    };
  }
}
