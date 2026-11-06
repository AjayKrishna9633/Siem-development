import { injectable, inject } from 'inversify';
import { randomUUID } from 'node:crypto';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { IAuthMailer } from '../../interfaces/services/auth-mailer.interface.ts';
import type { IInviteUserUseCase } from '../../interfaces/use-cases/invites.interface.ts';
import type { IInviteResult, IInviteUserInput } from '../../types/use-case/invite.types.ts';
import { User } from '../../../domain/entities/user.entity.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';
import { toManagedUser } from '../users/managed-user.ts';
import { deliverInvite } from './invite-delivery.ts';

@injectable()
export class InviteUserUseCase implements IInviteUserUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.SystemSettingsRepository) private readonly settings: ISystemSettingsRepository,
    @inject(TYPES.AuthTokenService) private readonly tokens: IAuthTokenService,
    @inject(TYPES.AuthMailer) private readonly mailer: IAuthMailer,
    @inject(TYPES.AuditLogRepository) private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: IInviteUserInput): Promise<IInviteResult> {
    assertPermission(input.actor, Permission.USERS_MANAGE);

    if (await this.users.findByEmail(input.email)) {
      throw new AppError(AppErrorCode.USER_ALREADY_EXISTS, ErrorMessage.USER_ALREADY_EXISTS);
    }

    const user = User.createInvited({
      id: randomUUID(),
      email: input.email,
      role: input.role,
      invitedById: input.actor.userId,
      now: new Date(),
    });
    await this.users.save(user);

    const invite = await deliverInvite(
      { settings: this.settings, tokens: this.tokens, mailer: this.mailer },
      user,
      input.actor.userId,
      false,
    );

    await this.audit.append({
      actorUserId: input.actor.userId,
      action: AuditAction.INVITE_CREATED,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      context: input.context,
      metadata: { email: user.email, role: user.role, emailed: invite.delivered },
    });

    return { user: toManagedUser(user), invite };
  }
}
