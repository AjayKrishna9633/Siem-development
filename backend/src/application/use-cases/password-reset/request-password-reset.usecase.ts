import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { IAuthMailer } from '../../interfaces/services/auth-mailer.interface.ts';
import type { IEmailService } from '../../interfaces/services/email.service.interface.ts';
import type { ILogger } from '../../interfaces/services/logger.interface.ts';
import type { IRequestPasswordResetUseCase } from '../../interfaces/use-cases/password-reset.interface.ts';
import type { IRequestPasswordResetInput } from '../../dtos/password-reset/request/password-reset-request.dto.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { createResetLink } from './reset-link.ts';

@injectable()
export class RequestPasswordResetUseCase implements IRequestPasswordResetUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.SystemSettingsRepository) private readonly settings: ISystemSettingsRepository,
    @inject(TYPES.AuthTokenService) private readonly tokens: IAuthTokenService,
    @inject(TYPES.AuthMailer) private readonly mailer: IAuthMailer,
    @inject(TYPES.EmailService) private readonly email: IEmailService,
    @inject(TYPES.AuditLogRepository) private readonly audit: IAuditLogRepository,
    @inject(TYPES.Logger) private readonly logger: ILogger,
  ) {}

  async execute(input: IRequestPasswordResetInput): Promise<void> {
    if (!this.email.isConfigured) return;

    const user = await this.users.findByEmail(input.email);
    if (!user || user.status !== UserStatus.ACTIVE) return;

    void this.sendLink(user, input).catch((err: unknown) =>
      this.logger.error('Password reset link could not be sent', { userId: user.id, err }),
    );
  }

  private async sendLink(user: User, input: IRequestPasswordResetInput): Promise<void> {
    const { link, expiresAt } = await createResetLink(this.settings, this.tokens, user, null);
    const { delivered } = await this.mailer.sendPasswordReset({
      to: user.email,
      name: user.displayName,
      link,
      expiresAt,
      byAdmin: false,
    });

    await this.audit.append({
      actorUserId: null,
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      context: input.context,
      metadata: { email: user.email, via: 'forgot-password', emailed: delivered },
    });
  }
}
