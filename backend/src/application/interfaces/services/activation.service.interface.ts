import type { UserRole } from '../../../domain/enums/UserRole.ts';

// Activation IDs are 24 random bytes as lowercase hex. Requests are checked against this
// before any lookup, so a mangled link is rejected without touching the cache.
export const ACTIVATION_ID_PATTERN = /^[0-9a-f]{48}$/;

// Handed back to the creator once; the temporary password is never stored in plain text
export interface IActivationGrant {
  activationId: string;
  activationLink: string;
  temporaryPassword: string;
  expiresAt: string;
  // False when the activation email could not be delivered, so the creator shares it by hand
  emailSent: boolean;
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
}

export interface IActivationService {
  // Replaces any earlier activation for the same user
  issue(input: IIssueActivationInput): Promise<IActivationGrant>;
  find(activationId: string): Promise<IActivationRecord | null>;
  findForUser(userId: string): Promise<{ activationId: string; record: IActivationRecord } | null>;
  // Counts a wrong temporary password; the activation is destroyed after too many
  recordFailure(activationId: string, record: IActivationRecord): Promise<void>;
  consume(activationId: string, userId: string): Promise<void>;
  revokeForUser(userId: string): Promise<void>;
}
