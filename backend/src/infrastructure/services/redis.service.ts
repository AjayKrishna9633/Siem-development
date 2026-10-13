import type { ICacheService } from '../../application/interfaces/services/cache.service.interface.ts';
import { Redis } from 'ioredis';

export class RedisCacheService implements ICacheService {
  constructor(private readonly redisClient: Redis) {}

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error parsing cache data for key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}
