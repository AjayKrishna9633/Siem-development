import type { ISystemSettingsRepository } from '../../interfaces/repositories/system-settings.repository.interface.ts';
import type { IAuthTokenService } from '../../interfaces/services/auth-token.service.interface.ts';
import type { IAuthMailer } from '../../interfaces/services/auth-mailer.interface.ts';
import type { IInviteDelivery } from '../../types/use-case/invite.types.ts';
import type { User } from '../../../domain/entities/user.entity.ts';
import { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

export interface IInviteDeliveryDeps {
  settings: ISystemSettingsRepository;
  tokens: IAuthTokenService;
  mailer: IAuthMailer;
}

export const deliverInvite = async (
  deps: IInviteDeliveryDeps,
  user: User,
  createdBy: string,
  replacesEarlier: boolean,
): Promise<IInviteDelivery> => {
  const settings = await deps.settings.get();
  const { token, expiresAt } = await deps.tokens.issue(user.id, AuthTokenType.INVITE, createdBy);
  const link = `${settings.baseUrl}/accept-invite?token=${token}`;

  const { delivered } = await deps.mailer.sendInvite({
    to: user.email,
    role: user.role,
    orgName: settings.orgName,
    link,
    expiresAt,
    replacesEarlier,
  });

  return delivered ? { delivered, expiresAt } : { delivered, expiresAt, link };
};

export const invalidInvite = () =>
  new AppError(AppErrorCode.INVALID_INVITE, ErrorMessage.INVALID_INVITE);

export const inviteNotPending = () =>
  new AppError(AppErrorCode.INVITE_NOT_PENDING, ErrorMessage.INVITE_NOT_PENDING);
