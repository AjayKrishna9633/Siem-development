import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { IGetPasswordResetUseCase } from '../../interfaces/use-cases/password-reset.interface.ts';
import type { IPasswordResetPreview } from '../../types/use-case/password-reset.types.ts';
import { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { invalidResetLink } from './reset-link.ts';

@injectable()
export class GetPasswordResetUseCase implements IGetPasswordResetUseCase {
  constructor(
    @inject(TYPES.AuthTokenService) private readonly tokens: IAuthTokenService,
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
  ) {}

  async execute(input: { token: string }): Promise<IPasswordResetPreview> {
    const link = await this.tokens.findUsable(input.token, AuthTokenType.RESET);
    const user = link ? await this.users.findById(link.userId) : null;
    if (!link || !user || user.status !== UserStatus.ACTIVE) throw invalidResetLink();

    return { email: user.email, expiresAt: link.expiresAt };
  }
}
