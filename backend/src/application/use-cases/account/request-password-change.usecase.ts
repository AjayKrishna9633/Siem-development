import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IVerificationCodeService } from '../../interfaces/services/verification-code.service.interface.ts';
import type { ISecurityMailer } from '../../interfaces/services/security-mailer.interface.ts';
import type { IRequestPasswordChangeUseCase } from '../../interfaces/use-cases/account.interface.ts';
import type {
  ICodeSentResponse,
  IRequestPasswordChangeInput,
} from '../../types/use-case/account.types.ts';
import { loadActiveUser, maskEmail } from './account-helpers.ts';

// Step 1 of changing a password: prove control of the account's inbox first
@injectable()
export class RequestPasswordChangeUseCase implements IRequestPasswordChangeUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.VerificationCodeService) private readonly codes: IVerificationCodeService,
    @inject(TYPES.SecurityMailer) private readonly mailer: ISecurityMailer,
  ) {}

  async execute(input: IRequestPasswordChangeInput): Promise<ICodeSentResponse> {
    const user = await loadActiveUser(this.users, input.actor.userId);

    const { code, expiresInMinutes } = await this.codes.issue('password-change', user.id, {});
    await this.mailer.sendVerificationCode({
      to: user.email,
      username: user.username,
      purpose: 'password-change',
      code,
      expiresInMinutes,
    });

    return { sentTo: maskEmail(user.email), expiresInMinutes };
  }
}
