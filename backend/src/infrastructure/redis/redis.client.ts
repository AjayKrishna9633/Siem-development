import { Redis } from 'ioredis';
import { env } from '../../config/env.config.ts';

export const createRedisClient = () => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 2) return null;
      return 1000;
    },
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  client.on('error', () => {
    // Suppress unhandled redis connection errors; handled gracefully by cache fallback
  });

  return client;
};
