import type { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';

export interface IAuthTokenRecord {
  id: string;
  userId: string;
  type: AuthTokenType;
  expiresAt: Date;
  createdBy: string | null;
  createdAt: Date;
}

export interface INewAuthToken {
  userId: string;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
  createdBy: string | null;
}

export interface IAuthTokenRepository {
  replace(token: INewAuthToken): Promise<void>;
  findUsableByHash(
    tokenHash: string,
    type: AuthTokenType,
    now: Date,
  ): Promise<IAuthTokenRecord | null>;
  consume(id: string, now: Date): Promise<boolean>;
  findUnusedByType(type: AuthTokenType): Promise<IAuthTokenRecord[]>;
}
