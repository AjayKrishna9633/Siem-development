import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ITokenPayload } from '../../interfaces/services/token.service.interface.ts';
import type {
  IResolveSessionUserInput,
  IResolveSessionUserUseCase,
} from '../../interfaces/use-cases/resolve-session-user.interface.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

@injectable()
export class ResolveSessionUserUseCase implements IResolveSessionUserUseCase {
  constructor(@inject(TYPES.UserRepository) private readonly _users: IUserRepository) {}

  async execute(input: IResolveSessionUserInput): Promise<ITokenPayload> {
    const user = await this._users.findById(input.userId);

    if (!user || user.status !== UserStatus.ACTIVE || user.tokenVersion !== input.tokenVersion) {
      throw new AppError(AppErrorCode.SESSION_REVOKED, ErrorMessage.SESSION_REVOKED);
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
  }
}
