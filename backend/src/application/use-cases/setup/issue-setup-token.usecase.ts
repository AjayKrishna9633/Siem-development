import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import { SETUP_TOKEN_TTL_HOURS } from '../../../domain/constants/security.ts';
import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IOpaqueTokenService } from '../../interfaces/services/opaque-token.service.interface.ts';
import type { IIssueSetupTokenUseCase } from '../../interfaces/use-cases/setup.interface.ts';
import type { IIssueSetupTokenInput } from '../../dtos/setup/request/setup-request.dto.ts';
import type { IssueSetupTokenResult } from '../../types/use-case/setup.types.ts';

@injectable()
export class IssueSetupTokenUseCase implements IIssueSetupTokenUseCase {
  constructor(
    @inject(TYPES.SystemSettingsRepository) private readonly settings: ISystemSettingsRepository,
    @inject(TYPES.OpaqueTokenService) private readonly tokens: IOpaqueTokenService,
  ) {}

  async execute(input: IIssueSetupTokenInput): Promise<IssueSetupTokenResult> {
    const settings = await this.settings.get();
    const now = new Date();

    if (settings.isSetupCompleted) return { status: 'completed' };
    if (!input.replaceExisting && settings.hasLiveSetupToken(now)) {
      return { status: 'existing', expiresAt: settings.setupTokenExpiresAt as Date };
    }

    const { token, hash } = this.tokens.generate();
    const expiresAt = new Date(now.getTime() + SETUP_TOKEN_TTL_HOURS * 60 * 60_000);
    settings.issueSetupToken(hash, expiresAt, now);
    await this.settings.save(settings);

    return { status: 'issued', token, expiresAt };
  }
}
