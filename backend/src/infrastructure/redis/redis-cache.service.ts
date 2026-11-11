import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { IRedisClient } from '../../application/interfaces/infrastructure/redis/redis-client.interface.ts';
import type {
  ICacheService,
  CacheKey,
} from '../../application/interfaces/services/cache.service.interface.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';

@injectable()
export class RedisCacheService implements ICacheService {
  private _fallbackStore = new Map<string, { value: string; expiresAt: number }>();
  private readonly _logger: ILogger;

  constructor(
    @inject(TYPES.RedisClient) private readonly _client: IRedisClient,
    @inject(TYPES.Logger) logger: ILogger,
  ) {
    this._logger = logger.child({ module: 'cache' });
  }

  private reportFailure(operation: string, key: CacheKey, err: unknown): void {
    if (this._client.status !== 'ready') return;
    this._logger.warn('Redis command failed, using the in-memory cache', {
      operation,
      keyType: key.split(':')[0],
      err,
    });
  }

  async set<T>(key: CacheKey, value: T, ttl: number): Promise<void> {
    const stringVal = JSON.stringify(value);
    try {
      await this._client.set(key, stringVal, 'EX', ttl);
    } catch (err) {
      this.reportFailure('set', key, err);
      this._fallbackStore.set(key, {
        value: stringVal,
        expiresAt: Date.now() + ttl * 1000,
      });
    }
  }

  async setIfAbsent<T>(key: CacheKey, value: T, ttl: number): Promise<boolean> {
    const stringVal = JSON.stringify(value);
    try {
      return (await this._client.set(key, stringVal, 'EX', ttl, 'NX')) === 'OK';
    } catch (err) {
      this.reportFailure('setIfAbsent', key, err);
      const existing = this._fallbackStore.get(key);
      if (existing && Date.now() <= existing.expiresAt) return false;
      this._fallbackStore.set(key, { value: stringVal, expiresAt: Date.now() + ttl * 1000 });
      return true;
    }
  }

  async get<T>(key: CacheKey): Promise<T | null> {
    try {
      const data = await this._client.get(key);
      if (data) return JSON.parse(data) as T;
    } catch (err) {
      this.reportFailure('get', key, err);
    }

    const item = this._fallbackStore.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this._fallbackStore.delete(key);
      return null;
    }

    return JSON.parse(item.value) as T;
  }

  async delete(key: CacheKey): Promise<void> {
    try {
      await this._client.del(key);
    } catch (err) {
      this.reportFailure('delete', key, err);
    }
    this._fallbackStore.delete(key);
  }
}
