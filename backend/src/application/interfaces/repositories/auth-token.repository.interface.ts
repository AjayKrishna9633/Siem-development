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
  // Stores the new link and, in the same transaction, deletes the user's earlier unused
  // links of that type — so only the newest one ever works
  replace(token: INewAuthToken): Promise<void>;
  // Unused and unexpired only
  findUsableByHash(
    tokenHash: string,
    type: AuthTokenType,
    now: Date,
  ): Promise<IAuthTokenRecord | null>;
  // Marks the link used if it still is unused and unexpired, in one UPDATE. Of several
  // simultaneous callers exactly one gets true, so a link can't be used twice.
  consume(id: string, now: Date): Promise<boolean>;
  findUnusedByType(type: AuthTokenType): Promise<IAuthTokenRecord[]>;
}
