import { injectable, inject } from 'inversify';
import { startSession } from '../shared/user-views.ts';
import { randomBytes } from 'node:crypto';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { ILoginInput } from '../../dtos/session/request/session-request.dto.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import type { ILoginUseCase } from '../../interfaces/use-cases/login.interface.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AuditOutcome } from '../../../domain/enums/AuditOutcome.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { auditActorOf } from '../shared/audit-actor.ts';

type FailureReason = 'unknown_account' | 'not_activated' | 'locked' | 'wrong_password' | 'disabled';

@injectable()
export class LoginUseCase implements ILoginUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.HashService) private readonly _hasher: IHashService,
    @inject(TYPES.SessionService) private readonly _sessions: ISessionService,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
  ) {}

  private _timingHash: Promise<string> | null = null;

  async execute(input: ILoginInput): Promise<ILoginResponse> {
    const invalidCredentials = new AppError(
      AppErrorCode.INVALID_CREDENTIALS,
      ErrorMessage.INVALID_CREDENTIALS,
    );
    const user = await this._users.findByEmail(input.email);
    const now = new Date();

    if (!user || !user.passwordHash || user.isLocked(now)) {
      this._timingHash ??= this._hasher.hash(randomBytes(16).toString('hex'));
      await this._hasher.compare(input.password, await this._timingHash);
      const reason = !user ? 'unknown_account' : !user.passwordHash ? 'not_activated' : 'locked';
      await this.recordFailure(input, user, reason);
      throw invalidCredentials;
    }

    if (!(await this._hasher.compare(input.password, user.passwordHash))) {
      user.recordFailedLogin(now);
      await this._users.save(user);
      await this.recordFailure(input, user, 'wrong_password');
      // The check above ruled out an already-locked account, so being locked now means this
      // attempt is the one that tripped the lockout.
      if (user.isLocked(now)) await this.recordLockout(user);
      throw invalidCredentials;
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.recordFailure(input, user, 'disabled');
      throw new AppError(AppErrorCode.ACCOUNT_INACTIVE, ErrorMessage.ACCOUNT_INACTIVE);
    }

    if (this._hasher.needsRehash(user.passwordHash)) {
      user.upgradePasswordHash(await this._hasher.hash(input.password));
    }
    user.recordSuccessfulLogin(input.context.ip, now);
    await this._users.save(user);

    await this._audit.record({
      action: AuditAction.LOGIN_SUCCEEDED,
      // Nobody is authenticated on this request yet, so name the user explicitly.
      actor: auditActorOf(user),
      targetType: AuditTargetType.USER,
      targetId: user.id,
      targetLabel: user.email,
    });

    return startSession(this._sessions, user);
  }

  private recordFailure(input: ILoginInput, user: User | null, reason: FailureReason) {
    return this._audit.record({
      action: AuditAction.LOGIN_FAILED,
      outcome: AuditOutcome.FAILURE,
      // Even a correct-looking account isn't the actor: the person failing to sign in is unproven.
      actor: null,
      ...(user && {
        targetType: AuditTargetType.USER,
        targetId: user.id,
        targetLabel: user.email,
      }),
      metadata: { email: input.email, reason },
    });
  }

  private recordLockout(user: User) {
    return this._audit.record({
      action: AuditAction.ACCOUNT_LOCKED,
      outcome: AuditOutcome.FAILURE,
      actor: null,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      targetLabel: user.email,
      metadata: { lockedUntil: user.toSnapshot().lockedUntil?.toISOString() ?? null },
    });
  }
}
