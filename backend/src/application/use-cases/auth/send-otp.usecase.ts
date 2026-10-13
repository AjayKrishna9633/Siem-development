import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IEmailService } from '../../interfaces/services/Email.service.interface.ts';
import type { ICacheService, CacheKey } from '../../interfaces/services/cache.service.interface.ts';
import type { IOtpGenerator } from '../../interfaces/services/otp.service.interface.ts';
import type { SendOtpInput } from '../../types/use-case/auth.types.ts';
import type { ISendOtpUseCase } from '../../interfaces/use-cases/send-otp.interface.ts';

@injectable()
export class SendOtpUseCase implements ISendOtpUseCase {
  private readonly OTP_TTL_SECONDS = 5 * 60;

  constructor(
    @inject(TYPES.OtpService) private readonly otpGenerator: IOtpGenerator,
    @inject(TYPES.CacheService) private readonly cacheService: ICacheService,
    @inject(TYPES.EmailService) private readonly emailService: IEmailService,
  ) {}

  async execute(input: SendOtpInput): Promise<void> {
    const otp = await this.otpGenerator.generateOtp();

    const email = input.email.trim().toLowerCase();
    const cacheKey: CacheKey = `otp:${input.type}:${email}`;
    await this.cacheService.set(cacheKey, otp, this.OTP_TTL_SECONDS);

    const subject = `Your ${input.type === 'signup' ? 'Sign Up' : 'Password Reset'} OTP`;
    const text = `Your OTP is ${otp}. It will expire in 5 minutes.`;

    await this.emailService.sendEmail(email, subject, text);
  }
}
