import type { QueryRunner } from 'typeorm';
import { AppDataSource } from '../infrastructure/database/data-source.ts';
import { BcryptHashService } from '../infrastructure/services/bcrypt-hash.service.ts';
import { env } from '../config/env.config.ts';
import { UserRole } from '../domain/enums/UserRole.ts';
import { UserStatus } from '../domain/enums/UserStatus.ts';
import { AuditAction, AuditTargetType } from '../domain/enums/AuditAction.ts';

// Development-only demo data. Every account that can sign in shares this password.
const DEMO_PASSWORD = 'SiempleDemo#2026';
const ORG_NAME = 'SIEMple Demo';
const BASE_URL = 'http://localhost:5173';

interface ISeedUser {
  key: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}

const USERS: readonly ISeedUser[] = [
  {
    key: 'admin',
    email: 'admin@siemple.local',
    username: 'Asha Admin',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  },
  {
    key: 't2a',
    email: 'ravi.t2@siemple.local',
    username: 'Ravi Menon',
    role: UserRole.T2_ANALYST,
    status: UserStatus.ACTIVE,
  },
  {
    key: 't2b',
    email: 'meera.t2@siemple.local',
    username: 'Meera Nair',
    role: UserRole.T2_ANALYST,
    status: UserStatus.ACTIVE,
  },
  {
    key: 't1a',
    email: 'arjun.t1@siemple.local',
    username: 'Arjun Das',
    role: UserRole.T1_ANALYST,
    status: UserStatus.ACTIVE,
  },
  {
    key: 't1b',
    email: 'divya.t1@siemple.local',
    username: 'Divya Pillai',
    role: UserRole.T1_ANALYST,
    status: UserStatus.ACTIVE,
  },
  {
    key: 'invited',
    email: 'new.hire@siemple.local',
    username: '',
    role: UserRole.T1_ANALYST,
    status: UserStatus.INVITED,
  },
  {
    key: 'disabled',
    email: 'former.t1@siemple.local',
    username: 'Kiran Rao',
    role: UserRole.T1_ANALYST,
    status: UserStatus.DISABLED,
  },
];

const reset = process.argv.includes('--reset');

if (env.NODE_ENV === 'production') {
  console.error('Refusing to seed: NODE_ENV is production.');
  process.exit(1);
}

const seedSettings = (runner: QueryRunner) =>
  runner.query(
    `INSERT INTO "system_settings" ("id", "setup_completed", "org_name", "base_url")
     VALUES (1, true, $1, $2)
     ON CONFLICT ("id") DO UPDATE
       SET "setup_completed" = true,
           "setup_token_hash" = NULL,
           "setup_token_expires_at" = NULL,
           "org_name" = EXCLUDED."org_name",
           "base_url" = EXCLUDED."base_url"`,
    [ORG_NAME, BASE_URL],
  );

const seedUsers = async (runner: QueryRunner, passwordHash: string) => {
  const ids = new Map<string, string>();
  let adminId: string | null = null;

  for (const user of USERS) {
    const invited = user.status === UserStatus.INVITED;
    const rows: { id: string }[] = await runner.query(
      `INSERT INTO "users"
         ("email", "username", "password_hash", "role", "status",
          "is_email_verified", "password_changed_at", "last_login_at", "invited_by_id")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING "id"`,
      [
        user.email,
        invited ? null : user.username,
        invited ? null : passwordHash,
        user.role,
        user.status,
        !invited,
        invited ? null : new Date(),
        user.status === UserStatus.ACTIVE ? new Date() : null,
        adminId,
      ],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error(`Insert returned no id for ${user.email}`);
    ids.set(user.key, id);
    if (user.role === UserRole.ADMIN) adminId = id;
  }
  return ids;
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

const seedAuditLogs = async (runner: QueryRunner, ids: Map<string, string>) => {
  const admin = ids.get('admin') ?? null;
  const entries: [string | null, AuditAction, AuditTargetType | null, string | null, number][] = [
    [admin, AuditAction.SETUP_COMPLETED, AuditTargetType.SYSTEM_SETTINGS, null, 72],
    [admin, AuditAction.INVITE_CREATED, AuditTargetType.USER, ids.get('t2a') ?? null, 70],
    [
      ids.get('t2a') ?? null,
      AuditAction.INVITE_ACCEPTED,
      AuditTargetType.USER,
      ids.get('t2a') ?? null,
      69,
    ],
    [admin, AuditAction.INVITE_CREATED, AuditTargetType.USER, ids.get('invited') ?? null, 24],
    [admin, AuditAction.USER_ROLE_CHANGED, AuditTargetType.USER, ids.get('t2b') ?? null, 12],
    [admin, AuditAction.USER_DISABLED, AuditTargetType.USER, ids.get('disabled') ?? null, 6],
    [null, AuditAction.LOGIN_FAILED, null, null, 2],
    [
      ids.get('t1a') ?? null,
      AuditAction.LOGIN_SUCCEEDED,
      AuditTargetType.USER,
      ids.get('t1a') ?? null,
      1,
    ],
  ];

  for (const [actor, action, targetType, targetId, age] of entries) {
    await runner.query(
      `INSERT INTO "audit_logs"
         ("actor_user_id", "action", "target_type", "target_id", "ip", "user_agent", "metadata", "created_at")
       VALUES ($1, $2, $3, $4, '127.0.0.1', 'seed-script', $5, $6)`,
      [actor, action, targetType, targetId, JSON.stringify({ seeded: true }), hoursAgo(age)],
    );
  }
  return entries.length;
};

await AppDataSource.initialize();
const runner = AppDataSource.createQueryRunner();
try {
  await AppDataSource.runMigrations({ transaction: 'each' });

  const countRows: { count: string }[] = await runner.query(
    `SELECT COUNT(*)::text AS "count" FROM "users"`,
  );
  const count = Number(countRows[0]?.count ?? 0);
  if (count > 0 && !reset) {
    console.error(
      `The database already has ${count} user(s); nothing was changed.\n` +
        'Run `npm run seed -- --reset` to delete all users and tokens and reseed (audit logs are kept).',
    );
    process.exitCode = 1;
  } else {
    const passwordHash = await new BcryptHashService().hash(DEMO_PASSWORD);

    await runner.startTransaction();
    try {
      // audit_logs is append-only (a trigger rejects UPDATE, DELETE and TRUNCATE), so history stays.
      if (reset) await runner.query(`TRUNCATE "auth_tokens", "users"`);
      await seedSettings(runner);
      const ids = await seedUsers(runner, passwordHash);
      const auditCount = await seedAuditLogs(runner, ids);
      await runner.commitTransaction();

      console.log(`Seeded ${ORG_NAME}: ${ids.size} users, ${auditCount} audit log entries.`);
      for (const user of USERS) {
        console.log(`  ${user.status.padEnd(8)}  ${user.role.padEnd(10)}  ${user.email}`);
      }
      console.log('Active accounts sign in with the DEMO_PASSWORD constant in src/cli/seed.ts.');
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    }
  }
} finally {
  await runner.release();
  await AppDataSource.destroy();
}
