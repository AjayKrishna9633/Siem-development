import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { ICreateRecoveryLinkUseCase } from '../../interfaces/use-cases/password-reset.interface.ts';
import type { IRecoveryLink } from '../../types/use-case/password-reset.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { createResetLink } from './reset-link.ts';

@injectable()
export class CreateRecoveryLinkUseCase implements ICreateRecoveryLinkUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.SystemSettingsRepository) private readonly settings: ISystemSettingsRepository,
    @inject(TYPES.AuthTokenService) private readonly tokens: IAuthTokenService,
    @inject(TYPES.AuditLogRepository) private readonly audit: IAuditLogRepository,
  ) {}

  async execute(input: { email: string }): Promise<IRecoveryLink> {
    const user = await this.users.findByEmail(input.email);
    if (!user || user.role !== UserRole.ADMIN) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.NOT_AN_ADMIN);
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(
        AppErrorCode.RESET_NEEDS_ACTIVE_USER,
        ErrorMessage.RESET_NEEDS_ACTIVE_USER,
      );
    }

    const recovery = await createResetLink(this.settings, this.tokens, user, null);

    await this.audit.append({
      actorUserId: null,
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      context: { ip: null, userAgent: 'reset-admin command' },
      metadata: { email: user.email, via: 'cli' },
    });

    return recovery;
  }
}
