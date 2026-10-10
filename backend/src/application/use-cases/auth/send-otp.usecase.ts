import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.js';
import type { IEmailService } from '../../interfaces/services/Email.service.interface.js';
import type { ICacheService, CacheKey } from '../../interfaces/services/cache.service.interface.js';
import type { IOtpGenerator } from '../../interfaces/services/otp.service.interface.js';
import type { SendOtpInput } from '../../types/use-case/auth.types.js';
import type { ISendOtpUseCase } from '../../interfaces/use-cases/send-otp.interface.js';

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

    const cacheKey: CacheKey = `otp:${input.type}:${input.email}`;
    await this.cacheService.set(cacheKey, otp, this.OTP_TTL_SECONDS);

    const subject = `Your ${input.type === 'signup' ? 'Sign Up' : 'Password Reset'} OTP`;
    const text = `Your OTP is ${otp}. It will expire in 5 minutes.`;

    await this.emailService.sendEmail(input.email, subject, text);
  }
}
