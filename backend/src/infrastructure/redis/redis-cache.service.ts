import { injectable, inject } from 'inversify';
import TYPES from '../../domain/constants/types.ts';
import type { IRedisClient } from '../../application/interfaces/infrastructure/redis/redis-client.interface.ts';
import type {
  ICacheService,
  CacheKey,
} from '../../application/interfaces/services/cache.service.interface.ts';

@injectable()
export class RedisCacheService implements ICacheService {
  constructor(@inject(TYPES.RedisClient) private readonly client: IRedisClient) {}
  async set<T>(key: CacheKey, value: T, ttl: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async get<T>(key: CacheKey): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }
  async delete(key: CacheKey): Promise<void> {
    await this.client.del(key);
  }
}
