import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IVerificationCodeService } from '../../interfaces/services/verification-code.service.interface.ts';
import type { ISecurityMailer } from '../../interfaces/services/security-mailer.interface.ts';
import type { SendOtpInput } from '../../types/use-case/auth.types.ts';
import type { ISendOtpUseCase } from '../../interfaces/use-cases/send-otp.interface.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';

// Forgot password, step 1. The caller always gets the same answer, whether or not the
// account exists, so this can't be used to discover accounts or to email strangers.
@injectable()
export class SendOtpUseCase implements ISendOtpUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.VerificationCodeService) private readonly codes: IVerificationCodeService,
    @inject(TYPES.SecurityMailer) private readonly mailer: ISecurityMailer,
  ) {}

  async execute(input: SendOtpInput): Promise<void> {
    const user = await this.users.findByEmail(input.email);
    // Invited accounts activate with their link; disabled ones must not regain access
    if (!user || user.status !== UserStatus.ACTIVE) return;

    const { code, expiresInMinutes } = await this.codes.issue('password-reset', user.id, {});

    // Not awaited: sending takes as long as the mail server does, and waiting for it
    // would reveal through the response time that the account exists
    void this.mailer
      .sendVerificationCode({
        to: user.email,
        username: user.displayName,
        purpose: 'password-reset',
        code,
        expiresInMinutes,
      })
      .catch((err: unknown) => console.error(`Password reset code to ${user.email} failed:`, err));
  }
}
