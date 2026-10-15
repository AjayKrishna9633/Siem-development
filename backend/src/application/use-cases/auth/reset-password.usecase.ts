import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ICacheService, CacheKey } from '../../interfaces/services/cache.service.interface.ts';
import type { IResetPasswordInput } from '../../types/use-case/auth.types.ts';
import type { IResetPasswordUseCase } from '../../interfaces/use-cases/reset-password.interface.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

@injectable()
export class ResetPasswordUseCase implements IResetPasswordUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.HashService) private readonly hasher: IHashService,
    @inject(TYPES.CacheService) private readonly cacheService: ICacheService,
  ) {}

  async execute(input: IResetPasswordInput): Promise<void> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const cacheKey: CacheKey = `reset-token:${input.resetToken.trim()}`;

    const cachedEmail = await this.cacheService.get<string>(cacheKey);

    if (!cachedEmail || cachedEmail.trim().toLowerCase() !== normalizedEmail) {
      throw new AppError(AppErrorCode.INVALID_RESET_TOKEN, ErrorMessage.INVALID_RESET_TOKEN);
    }

    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND, ErrorMessage.USER_NOT_FOUND);
    }

    const now = new Date();
    const newHash = await this.hasher.hash(input.newPassword);

    user.changePassword(newHash, now);
    await this.users.save(user);

    await this.cacheService.delete(cacheKey);
  }
}
