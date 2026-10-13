import { injectable, inject } from 'inversify';
import { timingSafeEqual } from 'node:crypto';
import TYPES from '../../../domain/constants/types.ts';
import type { ICacheService, CacheKey } from '../../interfaces/services/cache.service.interface.ts';
import type { IVerifyOtpInput } from '../../types/use-case/auth.types.ts';
import type { IVerifyOtpUseCase } from '../../interfaces/use-cases/verify-otp.interface.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

@injectable()
export class VerifyOtpUseCase implements IVerifyOtpUseCase {
  constructor(@inject(TYPES.CacheService) private readonly cacheService: ICacheService) {}

  async execute(input: IVerifyOtpInput): Promise<void> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const cacheKey: CacheKey = `otp:${input.type}:${normalizedEmail}`;
    const storedOtp = await this.cacheService.get<string>(cacheKey);

    if (!storedOtp) {
      throw new AppError(AppErrorCode.OTP_EXPIRED, ErrorMessage.OTP_EXPIRED);
    }

    const inputBuffer = Buffer.from(input.otp.trim());
    const storedBuffer = Buffer.from(storedOtp.trim());

    if (inputBuffer.length !== storedBuffer.length || !timingSafeEqual(inputBuffer, storedBuffer)) {
      throw new AppError(AppErrorCode.OTP_INVALID, ErrorMessage.OTP_INVALID);
    }

    // Invalidate the OTP after successful verification to prevent replay attacks
    await this.cacheService.delete(cacheKey);
  }
}
