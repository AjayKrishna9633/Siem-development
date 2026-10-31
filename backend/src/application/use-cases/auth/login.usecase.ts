import { injectable, inject } from 'inversify';
import { startSession } from '../shared/user-views.ts';
import { randomBytes } from 'node:crypto';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
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
  ) {}

  // A real bcrypt hash of a random value: an unknown email is checked against it, so it
  // takes as long to reject as a wrong password does
  private timingHash: Promise<string> | null = null;

  async execute(input: ILoginInput): Promise<ILoginResponse> {
    const invalidCredentials = new AppError(
      AppErrorCode.INVALID_CREDENTIALS,
      ErrorMessage.INVALID_CREDENTIALS,
    );
    const user = await this.users.findByEmail(input.email);
    const now = new Date();

    // Unknown, never-activated and locked accounts all look exactly like a wrong
    // password. A locked account's password is not checked, so the lock can't be
    // used to keep testing guesses.
    if (!user || !user.passwordHash || user.isLocked(now)) {
      this.timingHash ??= this.hasher.hash(randomBytes(16).toString('hex'));
      await this.hasher.compare(input.password, await this.timingHash);
      throw invalidCredentials;
    }

    if (!(await this.hasher.compare(input.password, user.passwordHash))) {
      user.recordFailedLogin(now);
      await this.users.save(user);
      throw invalidCredentials;
    }

    // Only someone who knows the password learns that the account is inactive
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(AppErrorCode.ACCOUNT_INACTIVE, ErrorMessage.ACCOUNT_INACTIVE);
    }

    user.recordSuccessfulLogin(input.ip ?? null, now);
    await this.users.save(user);

    return startSession(this.sessions, user);
  }
}
