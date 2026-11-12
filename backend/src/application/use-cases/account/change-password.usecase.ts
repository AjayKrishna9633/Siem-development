import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { ISecurityMailer } from '../../interfaces/services/security-mailer.interface.ts';
import type { IChangePasswordUseCase } from '../../interfaces/use-cases/account.interface.ts';
import type { IChangePasswordInput } from '../../dtos/account/request/account-request.dto.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { loadActiveUser } from './account-helpers.ts';
import { assertPasswordPolicy } from '../shared/access.ts';
import { startSession } from '../shared/user-views.ts';

@injectable()
export class ChangePasswordUseCase implements IChangePasswordUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.HashService) private readonly _hasher: IHashService,
    @inject(TYPES.SessionService) private readonly _sessions: ISessionService,
    @inject(TYPES.AuditLogRepository) private readonly _audit: IAuditLogRepository,
    @inject(TYPES.SecurityMailer) private readonly _mailer: ISecurityMailer,
  ) {}

  async execute(input: IChangePasswordInput): Promise<ILoginResponse> {
    const user = await loadActiveUser(this._users, input.actor.userId);

    const passwordHash = user.passwordHash as string;
    if (!(await this._hasher.compare(input.currentPassword, passwordHash))) {
      throw new AppError(
        AppErrorCode.INVALID_CURRENT_PASSWORD,
        ErrorMessage.INVALID_CURRENT_PASSWORD,
      );
    }
    if (await this._hasher.compare(input.newPassword, passwordHash)) {
      throw new AppError(AppErrorCode.SAME_PASSWORD, ErrorMessage.SAME_PASSWORD);
    }
    assertPasswordPolicy(input.newPassword);

    user.changePassword(await this._hasher.hash(input.newPassword), new Date());
    await this._users.save(user);
    await this._audit.append({
      actorUserId: user.id,
      action: AuditAction.PASSWORD_CHANGED,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      context: input.context,
    });
    await this._mailer.notifyPasswordChanged({ to: user.email, username: user.displayName });

    return startSession(this._sessions, user);
  }
}
