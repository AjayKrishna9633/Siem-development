import { injectable, inject } from 'inversify';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import TYPES from '../../domain/constants/types.ts';
import type {
  CacheKey,
  ICacheService,
} from '../../application/interfaces/services/cache.service.interface.ts';
import type {
  IVerificationCodeService,
  VerificationPurpose,
} from '../../application/interfaces/services/verification-code.service.interface.ts';

const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

interface IStoredCode<T> {
  codeHash: string;
  attempts: number;
  expiresAt: string;
  data: T;
}

const hashCode = (code: string) => createHash('sha256').update(code).digest();

@injectable()
export class VerificationCodeService implements IVerificationCodeService {
  constructor(@inject(TYPES.CacheService) private readonly _cache: ICacheService) {}

  private key(purpose: VerificationPurpose, userId: string): CacheKey {
    return `verify:${purpose}:${userId}`;
  }

  async issue<T extends object>(
    purpose: VerificationPurpose,
    userId: string,
    data: T,
  ): Promise<{ code: string; expiresInMinutes: number }> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const record: IStoredCode<T> = {
      codeHash: hashCode(code).toString('hex'),
      attempts: 0,
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000).toISOString(),
      data,
    };
    await this._cache.set(this.key(purpose, userId), record, TTL_MINUTES * 60);
    return { code, expiresInMinutes: TTL_MINUTES };
  }

  async check<T extends object>(
    purpose: VerificationPurpose,
    userId: string,
    code: string,
  ): Promise<T | null> {
    const key = this.key(purpose, userId);
    const record = await this._cache.get<IStoredCode<T>>(key);
    if (!record) return null;

    const matches = timingSafeEqual(hashCode(code.trim()), Buffer.from(record.codeHash, 'hex'));
    if (matches) return record.data;

    const attempts = record.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await this._cache.delete(key);
      return null;
    }
    const remainingSeconds = Math.max(
      1,
      Math.floor((new Date(record.expiresAt).getTime() - Date.now()) / 1000),
    );
    await this._cache.set(key, { ...record, attempts }, remainingSeconds);
    return null;
  }

  async consume(purpose: VerificationPurpose, userId: string): Promise<void> {
    await this._cache.delete(this.key(purpose, userId));
  }
}
