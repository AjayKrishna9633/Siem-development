import { injectable, inject } from 'inversify';
import { startSession } from '../shared/user-views.ts';
import { randomBytes } from 'node:crypto';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { ILoginInput, ILoginResponse } from '../../types/use-case/auth.types.ts';
import type { ILoginUseCase } from '../../interfaces/use-cases/login.interface.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

// Why a sign-in failed, for the audit log only. The caller always gets the same
// "invalid email or password" (except a correct password on a disabled account).
type FailureReason = 'unknown_account' | 'not_activated' | 'locked' | 'wrong_password' | 'disabled';

@injectable()
export class LoginUseCase implements ILoginUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.HashService) private readonly hasher: IHashService,
    @inject(TYPES.SessionService) private readonly sessions: ISessionService,
    @inject(TYPES.AuditLogRepository) private readonly audit: IAuditLogRepository,
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
      const reason = !user ? 'unknown_account' : !user.passwordHash ? 'not_activated' : 'locked';
      await this.recordFailure(input, user, reason);
      throw invalidCredentials;
    }

    if (!(await this.hasher.compare(input.password, user.passwordHash))) {
      user.recordFailedLogin(now);
      await this.users.save(user);
      await this.recordFailure(input, user, 'wrong_password');
      throw invalidCredentials;
    }

    // Only someone who knows the password learns that the account is inactive
    if (user.status !== UserStatus.ACTIVE) {
      await this.recordFailure(input, user, 'disabled');
      throw new AppError(AppErrorCode.ACCOUNT_INACTIVE, ErrorMessage.ACCOUNT_INACTIVE);
    }

    user.recordSuccessfulLogin(input.context.ip, now);
    await this.users.save(user);

    await this.audit.append({
      actorUserId: user.id,
      action: AuditAction.LOGIN_SUCCEEDED,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      context: input.context,
    });

    return startSession(this.sessions, user);
  }

  private recordFailure(input: ILoginInput, user: User | null, reason: FailureReason) {
    return this.audit.append({
      actorUserId: null,
      action: AuditAction.LOGIN_FAILED,
      ...(user && { targetType: AuditTargetType.USER, targetId: user.id }),
      context: input.context,
      metadata: { email: input.email, reason },
    });
  }
}
