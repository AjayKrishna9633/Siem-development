import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IEmailSettingsRepository } from '../../interfaces/repositories/email-settings.repository.interface.ts';
import type { ISecretCipher } from '../../interfaces/services/secret-cipher.service.interface.ts';
import type { IGetEmailSettingsUseCase } from '../../interfaces/use-cases/email-settings.interface.ts';
import type { IEmailSettingsActorInput } from '../../dtos/email-settings/request/email-settings-request.dto.ts';
import type {
  IEmailSettingsView,
  IEnvSmtpConfig,
} from '../../types/use-case/email-settings.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { assertPermission } from '../shared/access.ts';
import { toEmailSettingsView } from './email-settings-view.ts';

@injectable()
export class GetEmailSettingsUseCase implements IGetEmailSettingsUseCase {
  constructor(
    @inject(TYPES.EmailSettingsRepository) private readonly _settings: IEmailSettingsRepository,
    @inject(TYPES.SecretCipher) private readonly _cipher: ISecretCipher,
    @inject(TYPES.EnvSmtpConfig) private readonly _env: IEnvSmtpConfig | null,
  ) {}

  async execute(input: IEmailSettingsActorInput): Promise<IEmailSettingsView> {
    assertPermission(input.actor, Permission.SETTINGS_MANAGE);
    return toEmailSettingsView(await this._settings.get(), this._env, this._cipher.available);
  }
}
