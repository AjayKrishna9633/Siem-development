// Applies pending database migrations, then exits: 0 on success, 1 on failure.
//
// The production image has no tsx (a dev dependency), so `npm run migration:run` can't run
// there. This is the compiled equivalent: `node dist/cli/migrate.js`. The Docker `migrate`
// service runs it once before the API starts.
import 'reflect-metadata';
import { AppDataSource } from '../infrastructure/database/data-source.ts';
import { connectWithRetry } from '../infrastructure/database/connect-with-retry.ts';
import { logger } from '../infrastructure/logging/logger.ts';

const log = logger.child({ module: 'migrate' });

try {
  await connectWithRetry(() => AppDataSource.initialize(), log);

  // Each migration in its own transaction, as at server start: one that fails rolls back alone
  // and the ones before it stay applied.
  const applied = await AppDataSource.runMigrations({ transaction: 'each' });
  if (applied.length === 0) log.info('Database is up to date');
  for (const migration of applied) log.info('Migration applied', { migration: migration.name });
} catch (err) {
  log.error('Migration failed', { err });
  process.exitCode = 1;
} finally {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}
