import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { ILogoutInput, ILogoutUseCase } from '../../interfaces/use-cases/logout.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';

@injectable()
export class LogoutUseCase implements ILogoutUseCase {
  constructor(
    @inject(TYPES.SessionService) private readonly _sessions: ISessionService,
    @inject(TYPES.AuditLogRepository) private readonly _audit: IAuditLogRepository,
  ) {}

  async execute(input: ILogoutInput): Promise<void> {
    if (!input.refreshToken) return;
    const userId = await this._sessions.revoke(input.refreshToken);
    if (!userId) return;

    await this._audit.append({
      actorUserId: userId,
      action: AuditAction.LOGGED_OUT,
      targetType: AuditTargetType.USER,
      targetId: userId,
      context: input.context,
    });
  }
}
