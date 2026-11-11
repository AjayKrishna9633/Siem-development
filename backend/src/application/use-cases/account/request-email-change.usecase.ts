import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { IVerificationCodeService } from '../../interfaces/services/verification-code.service.interface.ts';
import type { ISecurityMailer } from '../../interfaces/services/security-mailer.interface.ts';
import type { IRequestEmailChangeUseCase } from '../../interfaces/use-cases/account.interface.ts';
import type { ICodeSentResponse } from '../../types/use-case/account.types.ts';
import type { IRequestEmailChangeInput } from '../../dtos/account/request/account-request.dto.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { loadActiveUser } from './account-helpers.ts';

export interface IPendingEmailChange {
  newEmail: string;
}

@injectable()
export class RequestEmailChangeUseCase implements IRequestEmailChangeUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly _users: IUserRepository,
    @inject(TYPES.HashService) private readonly _hasher: IHashService,
    @inject(TYPES.VerificationCodeService) private readonly _codes: IVerificationCodeService,
    @inject(TYPES.SecurityMailer) private readonly _mailer: ISecurityMailer,
  ) {}

  async execute(input: IRequestEmailChangeInput): Promise<ICodeSentResponse> {
    assertPermission(input.actor, Permission.USERS_MANAGE);
    const user = await loadActiveUser(this._users, input.actor.userId);

    if (!(await this._hasher.compare(input.currentPassword, user.passwordHash as string))) {
      throw new AppError(
        AppErrorCode.INVALID_CURRENT_PASSWORD,
        ErrorMessage.INVALID_CURRENT_PASSWORD,
      );
    }

    const { newEmail } = input;
    if (newEmail === user.email) {
      throw new AppError(AppErrorCode.SAME_EMAIL, ErrorMessage.SAME_EMAIL);
    }
    if (await this._users.findByEmail(newEmail)) {
      throw new AppError(AppErrorCode.EMAIL_TAKEN, ErrorMessage.EMAIL_TAKEN);
    }

    const pending: IPendingEmailChange = { newEmail };
    const { code, expiresInMinutes } = await this._codes.issue('email-change', user.id, pending);
    await this._mailer.sendVerificationCode({
      to: newEmail,
      username: user.displayName,
      purpose: 'email-change',
      code,
      expiresInMinutes,
    });

    return { sentTo: newEmail, expiresInMinutes };
  }
}
