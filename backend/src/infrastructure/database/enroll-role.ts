import type { DataSource } from 'typeorm';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';

// The database role the enrollment service connects as. Created by CreateEnrollmentLinks.
export const ENROLL_ROLE = 'siemple_enroll';

export const ENROLL_DB_PASSWORD_PATTERN = /^[A-Za-z0-9_-]{24,128}$/;

// Runs after the migrations, as the owner. The password comes from ENROLL_DB_PASSWORD, so it is
// never written into a migration, and changing it in .env takes effect on the next start.
// Without one the role is set back to NOLOGIN, so a removed password really locks it out.
export const syncEnrollRolePassword = async (
  db: DataSource,
  password: string | undefined,
  logger: ILogger,
): Promise<void> => {
  if (!password) {
    await db.query(`ALTER ROLE ${ENROLL_ROLE} NOLOGIN`);
    logger.info('ENROLL_DB_PASSWORD is not set: the enrollment service cannot connect');
    return;
  }
  if (!ENROLL_DB_PASSWORD_PATTERN.test(password)) {
    throw new Error('ENROLL_DB_PASSWORD must be 24-128 letters, digits, - or _');
  }
  // ALTER ROLE takes no bind parameters, so Postgres quotes the literal itself (%L).
  const [row] = await db.query<{ sql: string }[]>(
    `SELECT format('ALTER ROLE ${ENROLL_ROLE} LOGIN PASSWORD %L', $1::text) AS sql`,
    [password],
  );
  if (!row) throw new Error('Could not build the ALTER ROLE statement');
  await db.query(row.sql);
};
