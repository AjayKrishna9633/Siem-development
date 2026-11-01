import { Redis } from 'ioredis';
import { env } from '../../config/env.config.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';

// The URL with its password hidden, so it is safe to print
const safeUrl = (url: string) => url.replace(/\/\/([^@]*)@/, '//***@');

export const createRedisClient = (logger: ILogger) => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 2) return null;
      return 1000;
    },
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  // The cache falls back to memory when Redis is down, so the log is the only
  // place this shows. Logged on state changes only, not on every retry.
  let connected: boolean | null = null;

  client.on('ready', () => {
    if (connected !== true) logger.info('Redis connected', { url: safeUrl(env.REDIS_URL) });
    connected = true;
  });

  client.on('error', (err: Error) => {
    if (connected !== false) {
      logger.warn(
        'Redis not connected. Using the in-memory cache: sessions and verification codes are lost when the backend restarts.',
        { url: safeUrl(env.REDIS_URL), reason: err.message },
      );
    }
    connected = false;
  });

  client.on('end', () => {
    logger.warn(
      'Redis: stopped retrying. The in-memory cache stays in use until the backend restarts.',
    );
  });

  return client;
};
