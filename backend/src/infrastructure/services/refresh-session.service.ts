import { injectable, inject } from 'inversify';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import TYPES from '../../domain/constants/types.ts';
import type { ICacheService } from '../../application/interfaces/services/cache.service.interface.ts';
import type {
  ITokenPayload,
  ITokenService,
} from '../../application/interfaces/services/token.service.interface.ts';
import type {
  IRefreshTokenRecord,
  ISessionService,
  ISessionTokens,
} from '../../application/interfaces/services/session.service.interface.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

interface IStoredRefreshToken extends IRefreshTokenRecord {
  usedAt: number | null;
}

export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

// Two tabs can refresh with the same cookie at once; a reuse this soon after
// rotation is a race, not theft, so it is rejected without revoking the family.
const REUSE_GRACE_MS = 10_000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@injectable()
export class RefreshSessionService implements ISessionService {
  constructor(
    @inject(TYPES.CacheService) private readonly cache: ICacheService,
    @inject(TYPES.TokenService) private readonly tokenService: ITokenService,
  ) {}

  async issue(payload: ITokenPayload, familyId: string = randomUUID()): Promise<ISessionTokens> {
    const refreshToken = randomBytes(32).toString('hex');

    const record: IStoredRefreshToken = {
      userId: payload.userId,
      familyId,
      tokenVersion: payload.tokenVersion,
      usedAt: null,
    };

    // Only the hash is stored, so a cache dump does not leak usable tokens
    await this.cache.set(`refresh:${hashToken(refreshToken)}`, record, REFRESH_TTL_SECONDS);
    await this.cache.set(
      `refresh-family:${familyId}`,
      { userId: payload.userId },
      REFRESH_TTL_SECONDS,
    );

    return { accessToken: this.tokenService.generateAccessToken(payload), refreshToken };
  }

  async consume(refreshToken: string): Promise<IRefreshTokenRecord> {
    const key = `refresh:${hashToken(refreshToken)}` as const;
    const record = await this.cache.get<IStoredRefreshToken>(key);

    if (!record) {
      throw new AppError(AppErrorCode.INVALID_REFRESH_TOKEN, ErrorMessage.INVALID_REFRESH_TOKEN);
    }

    const family = await this.cache.get<{ userId: string }>(`refresh-family:${record.familyId}`);
    if (!family) {
      throw new AppError(AppErrorCode.SESSION_REVOKED, ErrorMessage.SESSION_REVOKED);
    }

    if (record.usedAt !== null) {
      if (Date.now() - record.usedAt > REUSE_GRACE_MS) {
        await this.revokeFamily(record.familyId);
        throw new AppError(AppErrorCode.SESSION_REVOKED, ErrorMessage.SESSION_REVOKED);
      }
      throw new AppError(AppErrorCode.INVALID_REFRESH_TOKEN, ErrorMessage.INVALID_REFRESH_TOKEN);
    }

    // Keep the used record until expiry so a later replay is detected
    await this.cache.set<IStoredRefreshToken>(
      key,
      { ...record, usedAt: Date.now() },
      REFRESH_TTL_SECONDS,
    );

    return { userId: record.userId, familyId: record.familyId, tokenVersion: record.tokenVersion };
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.cache.delete(`refresh-family:${familyId}`);
  }

  async revoke(refreshToken: string): Promise<void> {
    const record = await this.cache.get<IStoredRefreshToken>(`refresh:${hashToken(refreshToken)}`);
    if (record) await this.revokeFamily(record.familyId);
  }
}
