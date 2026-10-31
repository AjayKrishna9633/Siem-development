import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IRevokeInviteUseCase } from '../../interfaces/use-cases/invites.interface.ts';
import type { IManageInviteInput } from '../../types/use-case/invite.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';
import { inviteNotPending } from './invite-delivery.ts';

// The invited person never had access, so their row is deleted outright (their links go
// with it). The email can then be invited again; the audit log keeps the history.
@injectable()
export class RevokeInviteUseCase implements IRevokeInviteUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.AuditLogRepository) private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: IManageInviteInput): Promise<void> {
    assertPermission(input.actor, Permission.USERS_MANAGE);

    const user = await this.users.findById(input.userId);
    if (!user) throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);

    // Deletes only while still invited, so an invite accepted a moment ago survives
    if (!(await this.users.deleteInvited(user.id))) throw inviteNotPending();

    await this.audit.append({
      actorUserId: input.actor.userId,
      action: AuditAction.INVITE_REVOKED,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      context: input.context,
      metadata: { email: user.email, role: user.role },
    });
  }
}
