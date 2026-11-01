import app from './app.ts';
import { env } from './config/env.config.ts';
import { AppDataSource } from './infrastructure/database/data-source.ts';
import { emailConfigured, issueSetupToken, redisClient } from './infrastructure/di/index.ts';
import { logger } from './infrastructure/logging/logger.ts';
import { printSetupTokenBanner } from './cli/setup-banner.ts';

// TypeORM's own connection pool is the only one; a failed connect stops startup here
await AppDataSource.initialize();
const [row] = await AppDataSource.query<{ now: Date }[]>('SELECT now()');
logger.info('Database connected', { databaseTime: row?.now.toISOString() });

// A customer upgrading only restarts the server, so pending migrations run here.
// Each one runs in a transaction; a failure stops startup before any request is served.
const applied = await AppDataSource.runMigrations({ transaction: 'each' });
for (const migration of applied) logger.info('Migration applied', { migration: migration.name });

// Until the first admin exists, the operator needs a setup token from this output.
// The banner stays plain console output: it is for a person, and it is the only place
// the raw token is ever printed, so it is kept out of the structured log on purpose.
const setup = await issueSetupToken.execute({ replaceExisting: false });
if (setup.status === 'issued') {
  printSetupTokenBanner(setup.token, setup.expiresAt);
} else if (setup.status === 'existing') {
  logger.warn(
    'Setup is not complete. Use the setup token printed earlier, or run "npm run setup-token" if you no longer have it.',
    { setupTokenExpiresAt: setup.expiresAt.toISOString() },
  );
}

if (emailConfigured) {
  logger.info('Email is configured');
} else {
  logger.info(
    'Email is not configured (SMTP_HOST): invite and reset links will be shown to admins to pass on',
  );
}

// Connect now rather than on the first request, so the Redis status is logged at startup.
// A failure is already reported by the client's error listener.
redisClient.connect().catch(() => {});

const server = app.listen(env.PORT, () => logger.info('Server listening', { port: env.PORT }));

const shutdown = async () => {
  logger.info('Shutting down');
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
