import type { ITokenPayload } from './token.service.interface.ts';

export interface ISessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IRefreshTokenRecord {
  userId: string;
  familyId: string;
  tokenVersion: number;
}

export interface ISessionService {
  // Starts a new session family, or continues `familyId` when rotating
  issue(payload: ITokenPayload, familyId?: string): Promise<ISessionTokens>;
  // Marks a refresh token as used; reuse of a used token revokes its whole family
  consume(refreshToken: string): Promise<IRefreshTokenRecord>;
  revokeFamily(familyId: string): Promise<void>;
  // Ends the token's whole session family; returns whose session it was (null if unknown)
  revoke(refreshToken: string): Promise<string | null>;
}
