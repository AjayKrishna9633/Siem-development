import type { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import type { IAuthTokenRecord } from '../repositories/auth-token.repository.interface.ts';

export interface IIssuedAuthToken {
  token: string;
  expiresAt: Date;
}

export interface IAuthTokenService {
  issue(userId: string, type: AuthTokenType, createdBy: string | null): Promise<IIssuedAuthToken>;
  findUsable(token: string, type: AuthTokenType): Promise<IAuthTokenRecord | null>;
  consume(record: IAuthTokenRecord): Promise<boolean>;
}
