import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { ILogoutInput, ILogoutUseCase } from '../../interfaces/use-cases/logout.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';

@injectable()
export class LogoutUseCase implements ILogoutUseCase {
  constructor(
    @inject(TYPES.SessionService) private readonly sessions: ISessionService,
    @inject(TYPES.AuditLogRepository) private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: ILogoutInput): Promise<void> {
    // Logout is idempotent: a missing or expired cookie is already logged out
    if (!input.refreshToken) return;
    const userId = await this.sessions.revoke(input.refreshToken);
    if (!userId) return;

    await this.audit.append({
      actorUserId: userId,
      action: AuditAction.LOGGED_OUT,
      targetType: AuditTargetType.USER,
      targetId: userId,
      context: input.context,
    });
  }
}
