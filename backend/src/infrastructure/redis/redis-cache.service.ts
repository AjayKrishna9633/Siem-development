import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { IRedisClient } from '../../application/interfaces/infrastructure/redis/redis-client.interface.ts';
import type {
  ICacheService,
  CacheKey,
} from '../../application/interfaces/services/cache.service.interface.ts';

@injectable()
export class RedisCacheService implements ICacheService {
  private fallbackStore = new Map<string, { value: string; expiresAt: number }>();

  constructor(@inject(TYPES.RedisClient) private readonly client: IRedisClient) {}

  async set<T>(key: CacheKey, value: T, ttl: number): Promise<void> {
    const stringVal = JSON.stringify(value);
    try {
      await this.client.set(key, stringVal, 'EX', ttl);
    } catch {
      this.fallbackStore.set(key, {
        value: stringVal,
        expiresAt: Date.now() + ttl * 1000,
      });
    }
  }

  async setIfAbsent<T>(key: CacheKey, value: T, ttl: number): Promise<boolean> {
    const stringVal = JSON.stringify(value);
    try {
      return (await this.client.set(key, stringVal, 'EX', ttl, 'NX')) === 'OK';
    } catch {
      const existing = this.fallbackStore.get(key);
      if (existing && Date.now() <= existing.expiresAt) return false;
      this.fallbackStore.set(key, { value: stringVal, expiresAt: Date.now() + ttl * 1000 });
      return true;
    }
  }

  async get<T>(key: CacheKey): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (data) return JSON.parse(data) as T;
    } catch {}

    const item = this.fallbackStore.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.fallbackStore.delete(key);
      return null;
    }

    return JSON.parse(item.value) as T;
  }

  async delete(key: CacheKey): Promise<void> {
    try {
      await this.client.del(key);
    } catch {}
    this.fallbackStore.delete(key);
  }
}
