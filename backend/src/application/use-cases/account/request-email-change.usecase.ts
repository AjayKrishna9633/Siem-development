import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { IVerificationCodeService } from '../../interfaces/services/verification-code.service.interface.ts';
import type { ISecurityMailer } from '../../interfaces/services/security-mailer.interface.ts';
import type { IRequestEmailChangeUseCase } from '../../interfaces/use-cases/account.interface.ts';
import type {
  ICodeSentResponse,
  IRequestEmailChangeInput,
} from '../../types/use-case/account.types.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { loadActiveUser } from './account-helpers.ts';

export interface IPendingEmailChange {
  newEmail: string;
}

// Step 1 of an admin changing their own email. Analysts' addresses are managed by
// admins, so this is admin only. The code goes to the NEW address, which
// proves it exists and belongs to them before anything changes.
@injectable()
export class RequestEmailChangeUseCase implements IRequestEmailChangeUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.HashService) private readonly hasher: IHashService,
    @inject(TYPES.VerificationCodeService) private readonly codes: IVerificationCodeService,
    @inject(TYPES.SecurityMailer) private readonly mailer: ISecurityMailer,
  ) {}

  async execute(input: IRequestEmailChangeInput): Promise<ICodeSentResponse> {
    assertPermission(input.actor, Permission.USERS_MANAGE);
    const user = await loadActiveUser(this.users, input.actor.userId);

    if (!(await this.hasher.compare(input.currentPassword, user.passwordHash as string))) {
      throw new AppError(
        AppErrorCode.INVALID_CURRENT_PASSWORD,
        ErrorMessage.INVALID_CURRENT_PASSWORD,
      );
    }

    const { newEmail } = input; // already trimmed and lowercased by the request schema
    if (newEmail === user.email) {
      throw new AppError(AppErrorCode.SAME_EMAIL, ErrorMessage.SAME_EMAIL);
    }
    if (await this.users.findByEmail(newEmail)) {
      throw new AppError(AppErrorCode.EMAIL_TAKEN, ErrorMessage.EMAIL_TAKEN);
    }

    const pending: IPendingEmailChange = { newEmail };
    const { code, expiresInMinutes } = await this.codes.issue('email-change', user.id, pending);
    await this.mailer.sendVerificationCode({
      to: newEmail,
      username: user.username,
      purpose: 'email-change',
      code,
      expiresInMinutes,
    });

    // The user just typed this address, so it is shown in full
    return { sentTo: newEmail, expiresInMinutes };
  }
}
