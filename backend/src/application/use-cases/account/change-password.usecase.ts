import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IHashService } from '../../interfaces/services/hash.service.interface.ts';
import type { ISessionService } from '../../interfaces/services/session.service.interface.ts';
import type { IVerificationCodeService } from '../../interfaces/services/verification-code.service.interface.ts';
import type { ISecurityMailer } from '../../interfaces/services/security-mailer.interface.ts';
import type { IChangePasswordUseCase } from '../../interfaces/use-cases/account.interface.ts';
import type { IChangePasswordInput } from '../../types/use-case/account.types.ts';
import type { ILoginResponse } from '../../types/use-case/auth.types.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';
import { invalidCode, loadActiveUser } from './account-helpers.ts';
import { assertPasswordPolicy } from '../shared/access.ts';
import { startSession } from '../shared/user-views.ts';

// Step 2: the emailed code AND the current password are both required, so neither a
// stolen session nor a compromised inbox is enough on its own
@injectable()
export class ChangePasswordUseCase implements IChangePasswordUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.HashService) private readonly hasher: IHashService,
    @inject(TYPES.SessionService) private readonly sessions: ISessionService,
    @inject(TYPES.VerificationCodeService) private readonly codes: IVerificationCodeService,
    @inject(TYPES.SecurityMailer) private readonly mailer: ISecurityMailer,
  ) {}

  async execute(input: IChangePasswordInput): Promise<ILoginResponse> {
    const user = await loadActiveUser(this.users, input.actor.userId);

    // The code is checked first so the current password can't be guessed without it
    const pending = await this.codes.check('password-change', user.id, input.code);
    if (!pending) throw invalidCode();

    const passwordHash = user.passwordHash as string;
    if (!(await this.hasher.compare(input.currentPassword, passwordHash))) {
      throw new AppError(
        AppErrorCode.INVALID_CURRENT_PASSWORD,
        ErrorMessage.INVALID_CURRENT_PASSWORD,
      );
    }
    if (await this.hasher.compare(input.newPassword, passwordHash)) {
      throw new AppError(AppErrorCode.SAME_PASSWORD, ErrorMessage.SAME_PASSWORD);
    }
    assertPasswordPolicy(user, input.newPassword);

    user.changePassword(await this.hasher.hash(input.newPassword), new Date());
    await this.users.save(user);
    await this.codes.consume('password-change', user.id);
    await this.mailer.notifyPasswordChanged({ to: user.email, username: user.username });

    return startSession(this.sessions, user);
  }
}
