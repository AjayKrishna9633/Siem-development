import { injectable, inject } from 'inversify';
import { toUserProfile } from '../shared/user-views.ts';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IUpdateProfileUseCase } from '../../interfaces/use-cases/update-profile.interface.ts';
import type { IUpdateProfileDTO } from '../../dtos/user/request/user-request.dto.ts';
import type { IUserProfileResponse } from '../../types/use-case/auth.types.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

@injectable()
export class UpdateProfileUseCase implements IUpdateProfileUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
  ) {}

  async execute(input: IUpdateProfileDTO): Promise<IUserProfileResponse> {
    const user = await this._users.findById(input.id);

    if (!user) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(AppErrorCode.ACCOUNT_INACTIVE, ErrorMessage.ACCOUNT_INACTIVE);
    }

    const previousName = user.username;
    user.updateProfile({ username: input.username }, input.now);
    await this._users.save(user);

    if (user.username !== previousName) {
      await this._audit.record({
        action: AuditAction.USER_UPDATED,
        targetType: AuditTargetType.USER,
        targetId: user.id,
        targetLabel: user.email,
        metadata: { before: { username: previousName }, after: { username: user.username } },
      });
    }

    return toUserProfile(user);
  }
}
