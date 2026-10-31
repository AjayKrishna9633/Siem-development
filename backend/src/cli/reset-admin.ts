// `npm run reset-admin -- admin@acme.com`: lockout recovery. Prints a single-use link,
// valid 30 minutes, that lets that administrator choose a new password. For when no
// admin can sign in and email can't deliver a reset link. No password is ever typed
// into the shell, so none ends up in its history.
import { AppDataSource } from '../infrastructure/database/data-source.ts';
import { di } from '../infrastructure/di/index.ts';
import { AppError } from '../domain/errors/AppError.ts';

const email = process.argv[2]?.trim();
if (!email) {
  console.error('Usage: npm run reset-admin -- <admin email>');
  process.exit(1);
}

await AppDataSource.initialize();
try {
  await AppDataSource.runMigrations({ transaction: 'each' });

  const { link, expiresAt } = await di.createRecoveryLink.execute({ email });
  const rule = '='.repeat(72);
  console.log(
    [
      '',
      rule,
      `  Password reset link for ${email}`,
      '',
      `      ${link}`,
      '',
      `  Valid until ${expiresAt.toISOString()} and works once.`,
      '  Setting the new password signs this account out everywhere and clears any',
      '  sign-in lockout. Any earlier reset link for this account no longer works.',
      rule,
      '',
    ].join('\n'),
  );
} catch (err) {
  // Expected problems (no such admin, account disabled) are explained, not dumped
  if (!(err instanceof AppError)) throw err;
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await AppDataSource.destroy();
}
