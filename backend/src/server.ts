import app from './app.ts';
import { env } from './config/env.config.ts';
import { AppDataSource } from './infrastructure/database/data-source.ts';
import { redisClient } from './infrastructure/di/index.ts';

// TypeORM's own connection pool is the only one; a failed connect stops startup here
await AppDataSource.initialize();
const [row] = await AppDataSource.query<{ now: Date }[]>('SELECT now()');
console.log(`Database connected at ${row?.now.toISOString()}`);

// Connect now rather than on the first request, so the Redis status is logged at startup.
// A failure is already reported by the client's error listener.
redisClient.connect().catch(() => {});

const server = app.listen(env.PORT, () => console.log(`Server running on :${env.PORT}`));

const shutdown = async () => {
  console.log('Shutting down');
  server.close();
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  // quit() rejects when Redis was never connected; shutdown must still finish
  await redisClient.quit().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
