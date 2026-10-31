import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { IAuthMailer } from '../../interfaces/services/auth-mailer.interface.ts';
import type { IResendInviteUseCase } from '../../interfaces/use-cases/invites.interface.ts';
import type { IInviteDelivery, IManageInviteInput } from '../../types/use-case/invite.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';
import { deliverInvite, inviteNotPending } from './invite-delivery.ts';

// A fresh link with a fresh 48 hours; the previous link stops working at once
@injectable()
export class ResendInviteUseCase implements IResendInviteUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.SystemSettingsRepository) private readonly settings: ISystemSettingsRepository,
    @inject(TYPES.AuthTokenService) private readonly tokens: IAuthTokenService,
    @inject(TYPES.AuthMailer) private readonly mailer: IAuthMailer,
    @inject(TYPES.AuditLogRepository) private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: IManageInviteInput): Promise<IInviteDelivery> {
    assertPermission(input.actor, Permission.USERS_MANAGE);

    const user = await this.users.findById(input.userId);
    if (!user) throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
    if (user.status !== UserStatus.INVITED) throw inviteNotPending();

    const invite = await deliverInvite(
      { settings: this.settings, tokens: this.tokens, mailer: this.mailer },
      user,
      input.actor.userId,
      true,
    );

    await this.audit.append({
      actorUserId: input.actor.userId,
      action: AuditAction.INVITE_RESENT,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      context: input.context,
      metadata: { email: user.email, emailed: invite.delivered },
    });

    return invite;
  }
}
