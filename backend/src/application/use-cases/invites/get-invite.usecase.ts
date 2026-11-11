import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { IGetInviteUseCase } from '../../interfaces/use-cases/invites.interface.ts';
import type { IInvitePreview } from '../../types/use-case/invite.types.ts';
import { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { invalidInvite } from './invite-delivery.ts';

@injectable()
export class GetInviteUseCase implements IGetInviteUseCase {
  constructor(
    @inject(TYPES.AuthTokenService) private readonly _tokens: IAuthTokenService,
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.SystemSettingsRepository) private readonly _settings: ISystemSettingsRepository,
  ) {}

  async execute(input: { token: string }): Promise<IInvitePreview> {
    const link = await this._tokens.findUsable(input.token, AuthTokenType.INVITE);
    const user = link ? await this._users.findById(link.userId) : null;
    if (!link || !user || user.status !== UserStatus.INVITED) throw invalidInvite();

    const settings = await this._settings.get();
    return {
      email: user.email,
      role: user.role,
      orgName: settings.orgName,
      expiresAt: link.expiresAt,
    };
  }
}
