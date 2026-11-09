import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { IAuthMailer } from '../../interfaces/services/auth-mailer.interface.ts';
import type { IIssueResetLinkUseCase } from '../../interfaces/use-cases/password-reset.interface.ts';
import type { IIssueResetLinkInput } from '../../dtos/password-reset/request/password-reset-request.dto.ts';
import type { IResetLinkDelivery } from '../../types/use-case/password-reset.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';
import { createResetLink } from './reset-link.ts';

@injectable()
export class IssueResetLinkUseCase implements IIssueResetLinkUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.SystemSettingsRepository) private readonly settings: ISystemSettingsRepository,
    @inject(TYPES.AuthTokenService) private readonly tokens: IAuthTokenService,
    @inject(TYPES.AuthMailer) private readonly mailer: IAuthMailer,
    @inject(TYPES.AuditLogRepository) private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: IIssueResetLinkInput): Promise<IResetLinkDelivery> {
    assertPermission(input.actor, Permission.USERS_MANAGE);

    const user = await this.users.findById(input.userId);
    if (!user) throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(
        AppErrorCode.RESET_NEEDS_ACTIVE_USER,
        ErrorMessage.RESET_NEEDS_ACTIVE_USER,
      );
    }

    const { link, expiresAt } = await createResetLink(
      this.settings,
      this.tokens,
      user,
      input.actor.userId,
    );
    const { delivered } = await this.mailer.sendPasswordReset({
      to: user.email,
      name: user.displayName,
      link,
      expiresAt,
      byAdmin: true,
    });

    await this.audit.append({
      actorUserId: input.actor.userId,
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      context: input.context,
      metadata: { email: user.email, via: 'admin', emailed: delivered },
    });

    return delivered ? { delivered, expiresAt } : { delivered, expiresAt, link };
  }
}
