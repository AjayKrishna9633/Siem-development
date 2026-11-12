export type VerificationPurpose = 'email-change';

export interface IVerificationCodeService {
  issue<T extends object>(
    purpose: VerificationPurpose,
    userId: string,
    data: T,
  ): Promise<{ code: string; expiresInMinutes: number }>;
  check<T extends object>(
    purpose: VerificationPurpose,
    userId: string,
    code: string,
  ): Promise<T | null>;
  consume(purpose: VerificationPurpose, userId: string): Promise<void>;
}
