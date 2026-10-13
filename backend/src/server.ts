import app from './app.ts';
import { env } from './config/env.config.ts';
import { pool, checkDbConnection } from './infrastructure/database/sql.ts';
import { redisClient } from './infrastructure/di/index.ts';

await checkDbConnection();

const server = app.listen(env.PORT, () => console.log(`Server running on :${env.PORT}`));

const shutdown = async () => {
  console.log('Shutting down');
  server.close();
  await pool.end();
  await redisClient.quit();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
