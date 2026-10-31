import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { IVerificationCodeService } from '../../interfaces/services/verification-code.service.interface.ts';
import type { ISecurityMailer } from '../../interfaces/services/security-mailer.interface.ts';
import type { IChangeEmailUseCase } from '../../interfaces/use-cases/account.interface.ts';
import type { IChangeEmailInput } from '../../types/use-case/account.types.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import { UserRole } from '../../../domain/enums/UserRole.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertRole } from '../shared/access.ts';
import { invalidCode, loadActiveUser } from './account-helpers.ts';
import { startSession } from '../shared/user-views.ts';
import type { IPendingEmailChange } from './request-email-change.usecase.ts';

// Step 2: the code from the new inbox switches the sign-in email
@injectable()
export class ChangeEmailUseCase implements IChangeEmailUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.SessionService) private readonly sessions: ISessionService,
    @inject(TYPES.VerificationCodeService) private readonly codes: IVerificationCodeService,
    @inject(TYPES.SecurityMailer) private readonly mailer: ISecurityMailer,
  ) {}

  async execute(input: IChangeEmailInput): Promise<ILoginResponse> {
    assertRole(input.actor, UserRole.ADMIN);
    const user = await loadActiveUser(this.users, input.actor.userId);

    const pending = await this.codes.check<IPendingEmailChange>(
      'email-change',
      user.id,
      input.code,
    );
    if (!pending) throw invalidCode();

    // Someone may have taken the address in the minutes since the code was sent
    if (await this.users.findByEmail(pending.newEmail)) {
      await this.codes.consume('email-change', user.id);
      throw new AppError(AppErrorCode.EMAIL_TAKEN, ErrorMessage.EMAIL_TAKEN);
    }

    const oldEmail = user.email;
    user.changeEmail(pending.newEmail, new Date());
    await this.users.save(user);
    await this.codes.consume('email-change', user.id);
    await this.mailer.notifyEmailChanged({
      oldEmail,
      newEmail: user.email,
      username: user.username,
    });

    return startSession(this.sessions, user);
  }
}
