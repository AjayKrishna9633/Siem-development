import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { IVerificationCodeService } from '../../interfaces/services/verification-code.service.interface.ts';
import type { ISecurityMailer } from '../../interfaces/services/security-mailer.interface.ts';
import type { IChangeEmailUseCase } from '../../interfaces/use-cases/account.interface.ts';
import type { IChangeEmailInput } from '../../dtos/account/request/account-request.dto.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { assertPermission } from '../shared/access.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { invalidCode, loadActiveUser } from './account-helpers.ts';
import { startSession } from '../shared/user-views.ts';
import type { IPendingEmailChange } from './request-email-change.usecase.ts';

@injectable()
export class ChangeEmailUseCase implements IChangeEmailUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.SessionService) private readonly sessions: ISessionService,
    @inject(TYPES.VerificationCodeService) private readonly codes: IVerificationCodeService,
    @inject(TYPES.SecurityMailer) private readonly mailer: ISecurityMailer,
  ) {}

  async execute(input: IChangeEmailInput): Promise<ILoginResponse> {
    assertPermission(input.actor, Permission.USERS_MANAGE);
    const user = await loadActiveUser(this.users, input.actor.userId);

    const pending = await this.codes.check<IPendingEmailChange>(
      'email-change',
      user.id,
      input.code,
    );
    if (!pending) throw invalidCode();

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
      username: user.displayName,
    });

    return startSession(this.sessions, user);
  }
}
