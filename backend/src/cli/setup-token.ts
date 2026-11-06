import { AppDataSource } from '../infrastructure/database/data-source.ts';
import { di } from '../infrastructure/di/index.ts';
import { printSetupTokenBanner } from './setup-banner.ts';

await AppDataSource.initialize();
try {
  await AppDataSource.runMigrations({ transaction: 'each' });

  const result = await di.issueSetupToken.execute({ replaceExisting: true });
  if (result.status === 'issued') {
    printSetupTokenBanner(result.token, result.expiresAt);
  } else {
    console.error('Setup is already complete, so a setup token is no longer needed.');
    process.exitCode = 1;
  }
} finally {
  await AppDataSource.destroy();
}
