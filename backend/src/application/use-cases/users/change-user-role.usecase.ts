import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IChangeUserRoleUseCase } from '../../interfaces/use-cases/users.interface.ts';
import type { IChangeUserRoleInput, IManagedUser } from '../../types/use-case/user-mgmt.types.ts';
import type { UserRole } from '../../../domain/enums/UserRole.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';
import { assertAnAdminRemains, assertNotSelf } from './admin-guard.ts';
import { toManagedUser } from './managed-user.ts';

@injectable()
export class ChangeUserRoleUseCase implements IChangeUserRoleUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.AuditLogRepository) private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: IChangeUserRoleInput): Promise<IManagedUser> {
    assertPermission(input.actor, Permission.USERS_MANAGE);
    assertNotSelf(input.actor, input.userId);

    let previousRole: UserRole | null = null;
    const user = await this.users.changeWithAdminLock(input.userId, (target, activeAdmins) => {
      previousRole = target.role;
      const wasActiveAdmin = target.isActiveAdmin;
      target.changeRole(input.role, new Date());
      assertAnAdminRemains(wasActiveAdmin, target, activeAdmins);
    });
    if (!user) throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);

    if (previousRole !== input.role) {
      await this.audit.append({
        actorUserId: input.actor.userId,
        action: AuditAction.USER_ROLE_CHANGED,
        targetType: AuditTargetType.USER,
        targetId: user.id,
        context: input.context,
        metadata: { from: previousRole, to: input.role },
      });
    }

    return toManagedUser(user);
  }
}
