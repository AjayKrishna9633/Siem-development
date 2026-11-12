import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IAuditLogRepository } from '../../interfaces/repositories/audit-log.repository.interface.ts';
import type { IOpaqueTokenService } from '../../interfaces/services/opaque-token.service.interface.ts';
import type { IVerifySetupTokenUseCase } from '../../interfaces/use-cases/setup.interface.ts';
import type { IVerifySetupTokenInput } from '../../dtos/setup/request/setup-request.dto.ts';
import {
  invalidSetupToken,
  isSetupTokenValid,
  recordRejectedSetupToken,
  setupAlreadyCompleted,
} from './setup-token.ts';

@injectable()
export class VerifySetupTokenUseCase implements IVerifySetupTokenUseCase {
  constructor(
    @inject(TYPES.SystemSettingsRepository) private readonly _settings: ISystemSettingsRepository,
    @inject(TYPES.OpaqueTokenService) private readonly _tokens: IOpaqueTokenService,
    @inject(TYPES.AuditLogRepository) private readonly _audit: IAuditLogRepository,
  ) {}

  async execute(input: IVerifySetupTokenInput): Promise<void> {
    const settings = await this._settings.get();
    if (settings.isSetupCompleted) throw setupAlreadyCompleted();

    if (!isSetupTokenValid(settings, input.token, this._tokens, new Date())) {
      await recordRejectedSetupToken(this._audit, input.context);
      throw invalidSetupToken();
    }
  }
}
