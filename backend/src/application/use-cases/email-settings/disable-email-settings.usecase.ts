import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IEmailSettingsRepository } from '../../interfaces/repositories/email-settings.repository.interface.ts';
import type { ISecretCipher } from '../../interfaces/services/secret-cipher.service.interface.ts';
import type { IMailTransportProvider } from '../../interfaces/services/mail-transport.provider.interface.ts';
import type { IAuditService } from '../../interfaces/services/audit.service.interface.ts';
import type { IDisableEmailSettingsUseCase } from '../../interfaces/use-cases/email-settings.interface.ts';
import type { IEmailSettingsActorInput } from '../../dtos/email-settings/request/email-settings-request.dto.ts';
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
import { assertPermission } from '../shared/access.ts';
import { changedEmailFields, toEmailSettingsView } from './email-settings-view.ts';

// Turns database email off and forgets the password; host and sender stay for next time.
@injectable()
export class DisableEmailSettingsUseCase implements IDisableEmailSettingsUseCase {
  constructor(
    @inject(TYPES.EmailSettingsRepository) private readonly _settings: IEmailSettingsRepository,
    @inject(TYPES.SecretCipher) private readonly _cipher: ISecretCipher,
    @inject(TYPES.MailTransportProvider) private readonly _transports: IMailTransportProvider,
    @inject(TYPES.AuditService) private readonly _audit: IAuditService,
    @inject(TYPES.EnvSmtpConfig) private readonly _env: IEnvSmtpConfig | null,
  ) {}

  async execute(input: IEmailSettingsActorInput): Promise<IEmailSettingsView> {
    assertPermission(input.actor, Permission.SETTINGS_MANAGE);
    if (this._env) {
      throw new AppError(AppErrorCode.EMAIL_MANAGED_BY_ENV, ErrorMessage.EMAIL_MANAGED_BY_ENV);
    }

    const before = await this._settings.get();
    const after: IEmailSettings = {
      ...before,
      enabled: false,
      password: null,
      lastTestAt: null,
      lastTestOk: null,
      lastTestError: null,
      updatedBy: input.actor.userId,
    };
    const changedFields = changedEmailFields(before, after, before.password !== null);

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
