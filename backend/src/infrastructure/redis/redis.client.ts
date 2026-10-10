import { Redis } from 'ioredis';
import { env } from '../../config/env.js';

export const createRedisClient = () => {
    const client = new Redis(env.REDIS_URL);

    client.on('error', (err) => {
        console.error('Redis Client Error:', err);
    });

    return client;
};
