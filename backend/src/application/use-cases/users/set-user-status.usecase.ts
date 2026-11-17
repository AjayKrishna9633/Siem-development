import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { ISetUserStatusUseCase } from '../../interfaces/use-cases/users.interface.ts';
import type { IManagedUser } from '../../types/use-case/user-mgmt.types.ts';
import type { ISetUserStatusInput } from '../../dtos/user/request/user-request.dto.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';
import { assertAnAdminRemains, assertNotSelf } from './admin-guard.ts';
import { toManagedUser } from './managed-user.ts';

@injectable()
export class SetUserStatusUseCase implements ISetUserStatusUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
  ) {}

  async execute(input: ISetUserStatusInput): Promise<IManagedUser> {
    assertPermission(input.actor, Permission.USERS_MANAGE);
    assertNotSelf(input.actor, input.userId);

    // Disabling an account revokes access, so like a role change its audit row is written in the
    // same transaction as the change itself.
    const user = await this._users.changeWithAdminLock(
      input.userId,
      (target, activeAdmins) => {
        const wasActiveAdmin = target.isActiveAdmin;
        const now = new Date();
        if (input.enabled) target.enable(now);
        else target.disable(now);
        assertAnAdminRemains(wasActiveAdmin, target, activeAdmins);
      },
      (updated) =>
        this._audit.prepare({
          action: input.enabled ? AuditAction.USER_ENABLED : AuditAction.USER_DISABLED,
          targetType: AuditTargetType.USER,
          targetId: updated.id,
          targetLabel: updated.email,
          metadata: { email: updated.email },
        }),
    );
    if (!user) throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);

    return toManagedUser(user);
  }
}
