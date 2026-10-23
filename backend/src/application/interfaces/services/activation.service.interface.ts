import type { UserRole } from '../../../domain/enums/UserRole.ts';

// Handed back to the creator once; the temporary password is never stored in plain text
export interface IActivationGrant {
  activationId: string;
  activationLink: string;
  temporaryPassword: string;
  expiresAt: string;
}

export interface IActivationRecord {
  userId: string;
  email: string;
  temporaryPasswordHash: string;
  failedAttempts: number;
  expiresAt: string;
}

export interface IIssueActivationInput {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  companyName: string;
}

export interface IActivationService {
  // Replaces any earlier activation for the same user
  issue(input: IIssueActivationInput): Promise<IActivationGrant>;
  find(activationId: string): Promise<IActivationRecord | null>;
  // Counts a wrong email/password guess; the activation is destroyed after too many
  recordFailure(activationId: string, record: IActivationRecord): Promise<void>;
  consume(activationId: string, userId: string): Promise<void>;
  revokeForUser(userId: string): Promise<void>;
}
