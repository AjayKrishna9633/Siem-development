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
  issue(payload: ITokenPayload, familyId?: string): Promise<ISessionTokens>;
  consume(refreshToken: string): Promise<IRefreshTokenRecord>;
  revokeFamily(familyId: string): Promise<void>;
  revoke(refreshToken: string): Promise<string | null>;
}
