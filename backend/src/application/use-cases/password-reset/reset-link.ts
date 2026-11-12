import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

export const createResetLink = async (
  settings: ISystemSettingsRepository,
  tokens: IAuthTokenService,
  user: User,
  createdBy: string | null,
): Promise<{ link: string; expiresAt: Date }> => {
  const { baseUrl } = await settings.get();
  const { token, expiresAt } = await tokens.issue(user.id, AuthTokenType.RESET, createdBy);
  return { link: `${baseUrl}/reset-password?token=${token}`, expiresAt };
};

export const invalidResetLink = () =>
  new AppError(AppErrorCode.INVALID_RESET_LINK, ErrorMessage.INVALID_RESET_LINK);
