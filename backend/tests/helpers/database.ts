import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { di } from '../../src/infrastructure/di/index.ts';

const assertTestDatabase = () => {
  const connectedTo = (AppDataSource.options as { url?: string }).url;
  if (!process.env.TEST_DATABASE_URL || connectedTo !== process.env.TEST_DATABASE_URL) {
    throw new Error(
      'Integration tests need TEST_DATABASE_URL in backend/.env (a separate, disposable database).',
    );
  }
};

export const recreateDatabase = async (): Promise<void> => {
  assertTestDatabase();
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  await AppDataSource.query('DROP SCHEMA public CASCADE');
  await AppDataSource.query('CREATE SCHEMA public');
  await AppDataSource.runMigrations({ transaction: 'each' });
};

export const closeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
};

export const issueSetupToken = async (): Promise<string> => {
  const result = await di.issueSetupToken.execute({ replaceExisting: true });
  if (result.status !== 'issued')
    throw new Error(`Expected a new setup token, got ${result.status}`);
  return result.token;
};

export const expireSetupToken = () =>
  AppDataSource.query(
    `UPDATE system_settings SET setup_token_expires_at = now() - interval '1 minute'`,
  );

export const countUsers = async (): Promise<number> => {
  const [row] = await AppDataSource.query<{ count: string }[]>('SELECT count(*) FROM users');
  return Number(row?.count);
};

export const auditActions = async (): Promise<string[]> => {
  const rows = await AppDataSource.query<{ action: string }[]>(
    'SELECT action FROM audit_logs ORDER BY created_at',
  );
  return rows.map((r) => r.action);
};
