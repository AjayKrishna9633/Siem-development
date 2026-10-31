import { Redis } from 'ioredis';
import { env } from '../../config/env.config.ts';

// The URL with its password hidden, so it is safe to print
const safeUrl = (url: string) => url.replace(/\/\/([^@]*)@/, '//***@');

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

  // The cache falls back to memory when Redis is down, so the terminal is the only
  // place this shows. Logged on state changes only, not on every retry.
  let connected: boolean | null = null;

  client.on('ready', () => {
    if (connected !== true) console.log(`Redis connected at ${safeUrl(env.REDIS_URL)}`);
    connected = true;
  });

  client.on('error', (err: Error) => {
    if (connected !== false) {
      console.warn(
        `Redis not connected at ${safeUrl(env.REDIS_URL)} (${err.message}). ` +
          'Using the in-memory cache: sessions and verification codes are lost when the backend restarts.',
      );
    }
    connected = false;
  });

  client.on('end', () => {
    console.warn(
      'Redis: stopped retrying. The in-memory cache stays in use until the backend restarts.',
    );
  });

  return client;
};
