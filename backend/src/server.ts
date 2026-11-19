import app from './app.ts';
import { appOrigin, env } from './config/env.config.ts';
import { AppDataSource } from './infrastructure/database/data-source.ts';
import { connectWithRetry } from './infrastructure/database/connect-with-retry.ts';
import { emailConfigured, issueSetupToken, redisClient } from './infrastructure/di/index.ts';
import { logger } from './infrastructure/logging/logger.ts';
import { printSetupTokenBanner } from './cli/setup-banner.ts';

await connectWithRetry(() => AppDataSource.initialize(), logger);
const [row] = await AppDataSource.query<{ now: Date }[]>('SELECT now()');
logger.info('Database connected', { databaseTime: row?.now.toISOString() });

// In Docker the migrate service has already done this and it finds nothing to apply. It stays
// for `npm run dev`, which has no migrate step.
const applied = await AppDataSource.runMigrations({ transaction: 'each' });
for (const migration of applied) logger.info('Migration applied', { migration: migration.name });

// Only a hash of the setup token is stored, so an earlier token can't be shown again. Until
// setup is complete, every start issues a new one and prints it, so the newest log line always
// holds the one that works. Once setup is done this returns 'completed' and prints nothing.
const setup = await issueSetupToken.execute({ replaceExisting: true });
if (setup.status === 'issued') printSetupTokenBanner(setup.token, setup.expiresAt, appOrigin);

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
