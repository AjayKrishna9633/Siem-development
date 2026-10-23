import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { ICompanyRepository } from '../../interfaces/repositories/company.repository.interface.ts';
import { assertCompanyActive } from '../shared/access.ts';
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
    @inject(TYPES.SessionService) private readonly sessions: ISessionService,
    @inject(TYPES.CompanyRepository) private readonly companies: ICompanyRepository,
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

    // Checked after the password so company status is not revealed to guessers
    await assertCompanyActive(this.companies, user);

    user.recordSuccessfulLogin(input.ip ?? null, now);
    await this.users.save(user);

    const { accessToken, refreshToken } = await this.sessions.issue({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion,
    });

    return {
      accessToken,
      refreshToken,
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
