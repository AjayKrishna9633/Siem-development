import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import { AuthTokenType } from '../../domain/enums/AuthTokenType.ts';
import {
  INVITE_TOKEN_TTL_HOURS,
  RESET_TOKEN_TTL_MINUTES,
} from '../../domain/constants/security.ts';
import type {
  IAuthTokenRecord,
  IAuthTokenRepository,
} from '../../application/interfaces/repositories/auth-token.repository.interface.ts';
import type { IOpaqueTokenService } from '../../application/interfaces/services/opaque-token.service.interface.ts';
import type {
  IAuthTokenService,
  IIssuedAuthToken,
} from '../../application/interfaces/services/auth-token.service.interface.ts';

const LIFETIME_MS: Record<AuthTokenType, number> = {
  [AuthTokenType.INVITE]: INVITE_TOKEN_TTL_HOURS * 60 * 60_000,
  [AuthTokenType.RESET]: RESET_TOKEN_TTL_MINUTES * 60_000,
};

@injectable()
export class AuthTokenService implements IAuthTokenService {
  constructor(
    @inject(TYPES.AuthTokenRepository) private readonly tokens: IAuthTokenRepository,
    @inject(TYPES.OpaqueTokenService) private readonly opaque: IOpaqueTokenService,
  ) {}

  async issue(
    userId: string,
    type: AuthTokenType,
    createdBy: string | null,
  ): Promise<IIssuedAuthToken> {
    const { token, hash } = this.opaque.generate();
    const expiresAt = new Date(Date.now() + LIFETIME_MS[type]);
    await this.tokens.replace({ userId, type, tokenHash: hash, expiresAt, createdBy });
    return { token, expiresAt };
  }

  // Looked up by hash: the hash is a unique index, and finding the row already proves
  // the token matches, so no separate comparison is needed
  findUsable(token: string, type: AuthTokenType): Promise<IAuthTokenRecord | null> {
    return this.tokens.findUsableByHash(this.opaque.hash(token), type, new Date());
  }

  consume(record: IAuthTokenRecord): Promise<boolean> {
    return this.tokens.consume(record.id, new Date());
  }
}
