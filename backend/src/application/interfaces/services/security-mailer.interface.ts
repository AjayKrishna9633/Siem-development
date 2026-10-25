import type { VerificationPurpose } from './verification-code.service.interface.ts';

// Account-security emails. Codes must arrive, so sending one throws on failure;
// "your account changed" notices are best-effort and never fail the change itself.
export interface ISecurityMailer {
  sendVerificationCode(input: {
    to: string;
    username: string;
    purpose: VerificationPurpose;
    code: string;
    expiresInMinutes: number;
  }): Promise<void>;
  notifyPasswordChanged(input: { to: string; username: string }): Promise<void>;
  notifyEmailChanged(input: {
    oldEmail: string;
    newEmail: string;
    username: string;
  }): Promise<void>;
}
