import 'reflect-metadata';
import { AppDataSource } from '../infrastructure/database/data-source.ts';
import { connectWithRetry } from '../infrastructure/database/connect-with-retry.ts';
import { logger } from '../infrastructure/logging/logger.ts';
import { syncEnrollRolePassword } from '../infrastructure/database/enroll-role.ts';
import { env } from '../config/env.config.ts';

const log = logger.child({ module: 'migrate' });

try {
  await connectWithRetry(() => AppDataSource.initialize(), log);

  const applied = await AppDataSource.runMigrations({ transaction: 'each' });
  if (applied.length === 0) log.info('Database is up to date');
  for (const migration of applied) log.info('Migration applied', { migration: migration.name });

  await syncEnrollRolePassword(AppDataSource, env.ENROLL_DB_PASSWORD, log);
} catch (err) {
  log.error('Migration failed', { err });
  process.exitCode = 1;
} finally {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}
