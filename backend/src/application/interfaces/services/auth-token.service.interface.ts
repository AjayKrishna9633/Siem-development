import type { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import type { IAuthTokenRecord } from '../repositories/auth-token.repository.interface.ts';

export interface IIssuedAuthToken {
  // Goes into the link, once; never stored
  token: string;
  expiresAt: Date;
}

// Issues and checks single-use links: 32 random bytes, stored as a SHA-256 hash,
// with a lifetime per type (invite 48 h, reset 30 min)
export interface IAuthTokenService {
  // Replaces any earlier unused link of the same type for this user
  issue(userId: string, type: AuthTokenType, createdBy: string | null): Promise<IIssuedAuthToken>;
  findUsable(token: string, type: AuthTokenType): Promise<IAuthTokenRecord | null>;
  // True for exactly one caller; false if the link was used or expired meanwhile
  consume(record: IAuthTokenRecord): Promise<boolean>;
}
