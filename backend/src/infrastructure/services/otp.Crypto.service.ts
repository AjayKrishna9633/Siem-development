import { injectable } from 'inversify';
import type {
  IOtpGenerator,
  IOtpVerifier,
  IEmailSender,
} from '../../application/interfaces/services/otp.service.interface.ts';
import crypto from 'crypto';

@injectable()
export class OtpCryptoService implements IOtpGenerator, IOtpVerifier {
  async generateOtp(): Promise<string> {
    return crypto.randomBytes(6).toString('hex');
  }
  async verifyOtp(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
