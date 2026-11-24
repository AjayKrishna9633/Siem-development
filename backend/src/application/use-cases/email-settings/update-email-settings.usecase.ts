import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IEmailSettingsRepository } from '../../interfaces/repositories/email-settings.repository.interface.ts';
import type { ISecretCipher } from '../../interfaces/services/secret-cipher.service.interface.ts';
import type { IMailTransportProvider } from '../../interfaces/services/mail-transport.provider.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IUpdateEmailSettingsUseCase } from '../../interfaces/use-cases/email-settings.interface.ts';
import type { IUpdateEmailSettingsInput } from '../../dtos/email-settings/request/email-settings-request.dto.ts';
import type {
  IEmailSettingsView,
  IEnvSmtpConfig,
} from '../../types/use-case/email-settings.types.ts';
import type { IEmailSettings } from '../../../domain/types/email-settings.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { AuditAction, AuditTargetType } from '../../../domain/enums/AuditAction.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { SMTP_PASSWORD_AAD } from '../../../domain/constants/email.ts';
import { assertPermission } from '../shared/access.ts';
import {
  changedEmailFields,
  toEmailSettingsView,
  touchesConnection,
} from './email-settings-view.ts';

@injectable()
export class UpdateEmailSettingsUseCase implements IUpdateEmailSettingsUseCase {
  constructor(
    @inject(TYPES.EmailSettingsRepository) private readonly _settings: IEmailSettingsRepository,
    @inject(TYPES.SecretCipher) private readonly _cipher: ISecretCipher,
    @inject(TYPES.MailTransportProvider) private readonly _transports: IMailTransportProvider,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
    @inject(TYPES.EnvSmtpConfig) private readonly _env: IEnvSmtpConfig | null,
  ) {}

  async execute(input: IUpdateEmailSettingsInput): Promise<IEmailSettingsView> {
    assertPermission(input.actor, Permission.SETTINGS_MANAGE);
    if (this._env) {
      throw new AppError(AppErrorCode.EMAIL_MANAGED_BY_ENV, ErrorMessage.EMAIL_MANAGED_BY_ENV);
    }

    const before = await this._settings.get();
    // A new password needs the key; an empty field keeps the stored one; no username means no auth.
    const newPassword = input.username ? input.password : undefined;
    const password =
      input.username === null
        ? null
        : newPassword !== undefined
          ? this._cipher.encrypt(newPassword, SMTP_PASSWORD_AAD)
          : before.password;

    const after: IEmailSettings = {
      ...before,
      host: input.host,
      port: input.port,
      security: input.security,
      username: input.username,
      password,
      fromAddress: input.fromAddress,
      fromName: input.fromName,
      enabled: true,
      updatedBy: input.actor.userId,
    };
    const changedFields = changedEmailFields(
      before,
      after,
      newPassword !== undefined || (before.password !== null && password === null),
    );
    if (touchesConnection(changedFields)) {
      after.lastTestAt = null;
      after.lastTestOk = null;
      after.lastTestError = null;
    }

    await this._settings.save(after);
    this._transports.invalidate();
    if (changedFields.length > 0) {
      await this._audit.record({
        action: AuditAction.SYSTEM_SETTINGS_CHANGED,
        targetType: AuditTargetType.SYSTEM_SETTINGS,
        targetLabel: 'email',
        metadata: { section: 'email', changedFields },
      });
    }
    return toEmailSettingsView(await this._settings.get(), null, this._cipher.available);
  }
}
