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

// Runs on every authenticated request. An access token is valid for 15 minutes, but the
// account behind it can change sooner: a disabled user or a changed password must lose
// access at once, and a role change must apply to the very next request. So the token
// only says who you are; what you may do comes from the database.
@injectable()
export class ResolveSessionUserUseCase implements IResolveSessionUserUseCase {
  constructor(@inject(TYPES.UserRepository) private readonly users: IUserRepository) {}

  async execute(input: IResolveSessionUserInput): Promise<ITokenPayload> {
    const user = await this.users.findById(input.userId);

    // tokenVersion moves on password change, email change and disable
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
