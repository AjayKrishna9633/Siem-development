import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ITokenService } from '../../interfaces/services/token.service.interface.ts';
import type { ILoginInput, ILoginResponse } from '../../types/use-case/auth.types.ts';
import type { ILoginUseCase } from '../../interfaces/use-cases/login.interface.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

@injectable()
export class LoginUseCase implements ILoginUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.HashService) private readonly hasher: IHashService,
    @inject(TYPES.TokenService) private readonly tokenService: ITokenService,
  ) {}

  async execute(input: ILoginInput): Promise<ILoginResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);

    if (!user) {
      throw new AppError(AppErrorCode.INVALID_CREDENTIALS, ErrorMessage.INVALID_CREDENTIALS);
    }

    const now = new Date();

    if (user.isLocked(now)) {
      throw new AppError(AppErrorCode.ACCOUNT_LOCKED, ErrorMessage.ACCOUNT_LOCKED);
    }

    if (user.status !== UserStatus.ACTIVE || !user.passwordHash) {
      throw new AppError(AppErrorCode.ACCOUNT_INACTIVE, ErrorMessage.ACCOUNT_INACTIVE);
    }

    const isPasswordValid = await this.hasher.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      user.recordFailedLogin(now);
      await this.users.save(user);
      throw new AppError(AppErrorCode.INVALID_CREDENTIALS, ErrorMessage.INVALID_CREDENTIALS);
    }

    user.recordSuccessfulLogin(input.ip ?? null, now);
    await this.users.save(user);

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }
}
