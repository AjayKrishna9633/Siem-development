import app from './app.ts';
import { env } from './config/env.config.ts';
import { AppDataSource } from './infrastructure/database/data-source.ts';
import { issueSetupToken, redisClient } from './infrastructure/di/index.ts';
import { printSetupTokenBanner } from './cli/setup-banner.ts';

// TypeORM's own connection pool is the only one; a failed connect stops startup here
await AppDataSource.initialize();
const [row] = await AppDataSource.query<{ now: Date }[]>('SELECT now()');
console.log(`Database connected at ${row?.now.toISOString()}`);

// A customer upgrading only restarts the server, so pending migrations run here.
// Each one runs in a transaction; a failure stops startup before any request is served.
const applied = await AppDataSource.runMigrations({ transaction: 'each' });
for (const migration of applied) console.log(`Migration applied: ${migration.name}`);

// Until the first admin exists, the operator needs a setup token from this log
const setup = await issueSetupToken.execute({ replaceExisting: false });
if (setup.status === 'issued') {
  printSetupTokenBanner(setup.token, setup.expiresAt);
} else if (setup.status === 'existing') {
  console.log(
    `Setup is not complete. The setup token printed earlier is valid until ${setup.expiresAt.toISOString()}; ` +
      'run "npm run setup-token" if you no longer have it.',
  );
}

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
