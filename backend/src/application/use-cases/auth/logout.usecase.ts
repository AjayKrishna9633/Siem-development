import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ILogoutInput, ILogoutUseCase } from '../../interfaces/use-cases/logout.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { auditActorOf } from '../shared/audit-actor.ts';

@injectable()
export class LogoutUseCase implements ILogoutUseCase {
  constructor(
    @inject(TYPES.SessionService) private readonly _sessions: ISessionService,
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
  ) {}

  async execute(input: ILogoutInput): Promise<void> {
    if (!input.refreshToken) return;
    const userId = await this._sessions.revoke(input.refreshToken);
    if (!userId) return;

    const user = await this._users.findById(userId);
    await this._audit.record({
      action: AuditAction.LOGGED_OUT,
      actor: user ? auditActorOf(user) : { userId, username: userId, role: null },
      targetType: AuditTargetType.USER,
      targetId: userId,
      targetLabel: user?.email ?? null,
    });
  }
}
