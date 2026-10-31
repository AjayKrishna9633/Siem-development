// What a code confirms. One pending code per user per purpose; a new request replaces it.
export type VerificationPurpose = 'email-change';

export interface IVerificationCodeService {
  // Stores `data` alongside a fresh code (e.g. the new email being confirmed) and returns
  // the code for the caller to deliver
  issue<T extends object>(
    purpose: VerificationPurpose,
    userId: string,
    data: T,
  ): Promise<{ code: string; expiresInMinutes: number }>;
  // Returns the stored data when the code matches, null otherwise. A wrong code counts
  // as an attempt; too many destroy the code. A match is NOT consumed, so a later
  // check (like the current password) can still fail without burning the code.
  check<T extends object>(
    purpose: VerificationPurpose,
    userId: string,
    code: string,
  ): Promise<T | null>;
  consume(purpose: VerificationPurpose, userId: string): Promise<void>;
}
