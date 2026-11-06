import app from './app.ts';
import { env } from './config/env.config.ts';
import { AppDataSource } from './infrastructure/database/data-source.ts';
import { emailConfigured, issueSetupToken, redisClient } from './infrastructure/di/index.ts';
import { logger } from './infrastructure/logging/logger.ts';
import { printSetupTokenBanner } from './cli/setup-banner.ts';

await AppDataSource.initialize();
const [row] = await AppDataSource.query<{ now: Date }[]>('SELECT now()');
logger.info('Database connected', { databaseTime: row?.now.toISOString() });

const applied = await AppDataSource.runMigrations({ transaction: 'each' });
for (const migration of applied) logger.info('Migration applied', { migration: migration.name });

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

redisClient.connect().catch(() => {});

const server = app.listen(env.PORT, () => logger.info('Server listening', { port: env.PORT }));

const shutdown = async () => {
  logger.info('Shutting down');
  server.close();
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  await redisClient.quit().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
