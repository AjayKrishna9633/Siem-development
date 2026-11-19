import { AppDataSource } from '../infrastructure/database/data-source.ts';
import { di } from '../infrastructure/di/index.ts';
import { AppError } from '../domain/errors/AppError.ts';
import type { IIngestKey } from '../application/types/use-case/ingest-key.types.ts';

// Manage ingest API keys from the server, without signing in:
//   npm run ingest-key -- create <name> | list | revoke <id>
// In Docker: docker compose exec api node dist/cli/ingest-key.js create <name>
// Audited as the system, like reset-admin.

const USAGE = [
  'Usage:',
  '  ingest-key create <name>   create a key; it is printed once',
  '  ingest-key list            show all keys (never the keys themselves)',
  '  ingest-key revoke <id>     stop a key from working',
].join('\n');

const [command, arg] = process.argv.slice(2).map((a) => a.trim());

const row = (key: IIngestKey): string =>
  [
    key.id,
    key.active ? 'active ' : 'revoked',
    `${key.keyPrefix}…`.padEnd(18),
    key.name.padEnd(24),
    `last used ${key.lastUsedAt?.toISOString() ?? 'never'}`,
  ].join('  ');

const run = async (): Promise<void> => {
  if (command === 'create' && arg) {
    const { key, secret } = await di.ingestKeys.create.execute({ actor: null, name: arg });
    const rule = '='.repeat(72);
    console.log(
      [
        '',
        rule,
        `  Ingest key "${key.name}" (id ${key.id})`,
        '',
        `      ${secret}`,
        '',
        '  Copy it now: it is not stored and will not be shown again.',
        '  Send it as:  Authorization: Bearer <key>',
        rule,
        '',
      ].join('\n'),
    );
    return;
  }
  if (command === 'list') {
    const keys = await di.ingestKeys.list.execute({ actor: null });
    console.log(keys.length ? keys.map(row).join('\n') : 'No ingest keys yet.');
    return;
  }
  if (command === 'revoke' && arg) {
    const key = await di.ingestKeys.revoke.execute({ actor: null, id: arg });
    console.log(`Revoked "${key.name}" (${key.keyPrefix}…). It no longer works.`);
    return;
  }
  console.error(USAGE);
  process.exitCode = 1;
};

await AppDataSource.initialize();
try {
  await AppDataSource.runMigrations({ transaction: 'each' });
  await run();
} catch (err) {
  // An id that isn't a UUID reaches Postgres as invalid text; say so instead of a stack trace.
  const invalidId =
    typeof err === 'object' && err !== null && 'code' in err && err.code === '22P02';
  if (!(err instanceof AppError) && !invalidId) throw err;
  console.error(
    invalidId
      ? 'That is not a valid key id. Run "ingest-key list" to see them.'
      : (err as AppError).message,
  );
  process.exitCode = 1;
} finally {
  await AppDataSource.destroy();
}
