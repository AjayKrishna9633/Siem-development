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

const server = app.listen(env.PORT, (err?: Error) => {
  if (err) {
    logger.error('Server failed to start', { port: env.PORT, err });
    process.exit(1);
  }
  logger.info('Server listening', { port: env.PORT });
});

let shuttingDown = false;

const shutdown = async (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Shutting down', { signal });

  const forceExit = setTimeout(() => {
    logger.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    if (redisClient.status === 'ready') await redisClient.quit();
    else redisClient.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error('Shutdown failed', { err });
    process.exit(1);
  }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
