import { injectable, inject } from 'inversify';
import { randomBytes } from 'node:crypto';
import TYPES from '../../../domain/constants/types.ts';
import type { ICacheService, CacheKey } from '../../interfaces/services/cache.service.interface.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IVerificationCodeService } from '../../interfaces/services/verification-code.service.interface.ts';
import type { IVerifyOtpInput, IVerifyOtpResponse } from '../../types/use-case/auth.types.ts';
import type { IVerifyOtpUseCase } from '../../interfaces/use-cases/verify-otp.interface.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

// Forgot password, step 2: the emailed code is exchanged for a short-lived reset token.
// Codes are hashed and allow 5 wrong guesses per account, whichever IP they come from.
@injectable()
export class VerifyOtpUseCase implements IVerifyOtpUseCase {
  private readonly RESET_TOKEN_TTL_SECONDS = 15 * 60;

  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.VerificationCodeService) private readonly codes: IVerificationCodeService,
    @inject(TYPES.CacheService) private readonly cacheService: ICacheService,
  ) {}

  async execute(input: IVerifyOtpInput): Promise<IVerifyOtpResponse> {
    // An unknown account and a wrong code get the same answer
    const invalid = new AppError(AppErrorCode.OTP_INVALID, ErrorMessage.INVALID_VERIFICATION_CODE);

    const user = await this.users.findByEmail(input.email);
    if (!user || user.status !== UserStatus.ACTIVE) throw invalid;

    const pending = await this.codes.check('password-reset', user.id, input.otp);
    if (!pending) throw invalid;
    await this.codes.consume('password-reset', user.id);

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenKey: CacheKey = `reset-token:${resetToken}`;
    await this.cacheService.set(resetTokenKey, user.email, this.RESET_TOKEN_TTL_SECONDS);

    return { verified: true, resetToken };
  }
}
