import { Redis } from 'ioredis';
import { env } from '../../config/env.config.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';

const safeUrl = (url: string) => url.replace(/\/\/([^@]*)@/, '//***@');

export const createRedisClient = (logger: ILogger) => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => Math.min(times * 500, 10_000),
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  let lastError: string | null = null;

  client.on('ready', () => {
    logger.info('Redis connected', { url: safeUrl(env.REDIS_URL) });
    lastError = null;
  });

  client.on('error', (err: Error) => {
    if (err.message === lastError) return;
    lastError = err.message;
    logger.warn(
      'Redis error. Using the in-memory cache: sessions and verification codes are lost when the backend restarts.',
      { url: safeUrl(env.REDIS_URL), err },
    );
  });

  client.on('reconnecting', (delayMs: number) => {
    logger.debug('Redis reconnecting', { delayMs });
  });

  return client;
};
