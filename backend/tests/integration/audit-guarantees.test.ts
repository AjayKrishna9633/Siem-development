import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { AuditOutcome } from '../../src/domain/enums/AuditOutcome.ts';
import { AuditLogModel } from '../../src/infrastructure/database/models/audit-log.model.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { addActiveUser, PASSWORD, setupFirstAdmin, type ISignedInUser } from '../helpers/users.ts';

const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });

const count = async (where = 'true') =>
  (
    await AppDataSource.query<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM audit_logs WHERE ${where}`,
    )
  )[0]?.n ?? 0;

const scalar = async <T>(sql: string, params: unknown[] = []) =>
  (await AppDataSource.query<Record<string, T>[]>(sql, params))[0];

describe('the audit log cannot be rewritten', () => {
  beforeAll(async () => {
    await recreateDatabase();
    await setupFirstAdmin(app);
  });
  afterAll(closeDatabase);

  it('starts with entries to protect', async () => {
    expect(await count()).toBeGreaterThan(0);
  });

  it.each([
    ['UPDATE of every row', `UPDATE audit_logs SET outcome = 'success'`],
    [
      'UPDATE of the timestamp (backdating)',
      `UPDATE audit_logs SET occurred_at = now() - interval '1 year'`,
    ],
    [
      'UPDATE of the actor (blaming someone else)',
      `UPDATE audit_logs SET actor_username = 'someone else'`,
    ],
    ['UPDATE of the metadata', `UPDATE audit_logs SET metadata = '{}'::jsonb`],
    ['DELETE of everything', `DELETE FROM audit_logs`],
    ['DELETE of one row', `DELETE FROM audit_logs WHERE id = (SELECT id FROM audit_logs LIMIT 1)`],
    ['TRUNCATE', `TRUNCATE audit_logs`],
    ['TRUNCATE ... CASCADE', `TRUNCATE audit_logs CASCADE`],
  ])('rejects %s', async (_name, sql) => {
    const before = await count();
    const snapshot = await scalar<string>(
      `SELECT md5(string_agg(a::text, '' ORDER BY id)) AS h FROM audit_logs a`,
    );

    await expect(AppDataSource.query(sql)).rejects.toThrow(/audit_logs is append-only/);

    expect(await count()).toBe(before);
    expect(
      await scalar<string>(
        `SELECT md5(string_agg(a::text, '' ORDER BY id)) AS h FROM audit_logs a`,
      ),
    ).toEqual(snapshot);
  });

  it('rejects an update or delete through the ORM as well, so no code path can do it by accident', async () => {
    const repository = AppDataSource.getRepository(AuditLogModel);
    const [row] = await repository.find({ take: 1 });

    await expect(
      repository.update({ id: row?.id }, { outcome: AuditOutcome.FAILURE }),
    ).rejects.toThrow(/append-only/);
    await expect(repository.delete({ id: row?.id })).rejects.toThrow(/append-only/);
    await expect(repository.clear()).rejects.toThrow(/append-only/);
  });

  it('rejects a change made inside a transaction, and the rollback leaves the log intact', async () => {
    const before = await count();
    await expect(
      AppDataSource.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO audit_logs (action, category, outcome) VALUES ('test.tx', 'system', 'success')`,
        );
        await manager.query(`DELETE FROM audit_logs WHERE action = 'test.tx'`);
      }),
    ).rejects.toThrow(/append-only/);
    expect(await count()).toBe(before);
  });

  it('keeps the trigger armed, and refuses a value outside the allowed categories and outcomes', async () => {
    const trigger = await scalar<string>(
      `SELECT tgenabled FROM pg_trigger WHERE tgname = 'audit_logs_append_only'`,
    );
    expect(trigger?.tgenabled).toBe('O');

    await expect(
      AppDataSource.query(
        `INSERT INTO audit_logs (action, category, outcome) VALUES ('x', 'bogus', 'success')`,
      ),
    ).rejects.toThrow(/CHK_audit_logs_category/);
    await expect(
      AppDataSource.query(
        `INSERT INTO audit_logs (action, category, outcome) VALUES ('x', 'auth', 'maybe')`,
      ),
    ).rejects.toThrow(/CHK_audit_logs_outcome/);
  });

  it('stamps the time itself: a row inserted without one gets the database clock', async () => {
    await AppDataSource.query(
      `INSERT INTO audit_logs (action, category, outcome) VALUES ('test.clock', 'system', 'success')`,
    );
    const row = await scalar<number>(
      `SELECT extract(epoch FROM (clock_timestamp() - occurred_at)) AS age FROM audit_logs WHERE action = 'test.clock'`,
    );
    expect(Number(row?.age)).toBeGreaterThanOrEqual(0);
    expect(Number(row?.age)).toBeLessThan(5);
  });
});

// A broken audit write must not take the product down, except where the audit row and the change
// are one transaction. To make the audit insert fail for real, a constraint refuses specific
// actions; it is removed again in `finally` so the other tests in the file are unaffected.
describe('when an audit write fails', () => {
  let admin: ISignedInUser;
  let target: ISignedInUser;
  let other: ISignedInUser;

  const BLOCK = 'tmp_block_audit_writes';
  const blockActions = (...actions: string[]) =>
    AppDataSource.query(
      `ALTER TABLE audit_logs ADD CONSTRAINT ${BLOCK}
         CHECK (action NOT IN (${actions.map((a) => `'${a}'`).join(', ')})) NOT VALID`,
    );
  const unblock = () =>
    AppDataSource.query(`ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS ${BLOCK}`);

  const roleOf = async (id: string) =>
    (await scalar<string>(`SELECT role FROM users WHERE id = $1`, [id]))?.role;
  const statusOf = async (id: string) =>
    (await scalar<string>(`SELECT status FROM users WHERE id = $1`, [id]))?.status;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    target = await addActiveUser(app, admin, 'tier1@example.com', 't1_analyst');
    other = await addActiveUser(app, admin, 'tier1b@example.com', 't1_analyst');
  });
  afterAll(async () => {
    await unblock();
    await closeDatabase();
  });

  it('still signs the user in when the login entry cannot be written', async () => {
    await blockActions('auth.login.success');
    try {
      const before = await count(`action = 'auth.login.success'`);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(await count(`action = 'auth.login.success'`)).toBe(before);
    } finally {
      await unblock();
    }
  });

  it('still answers 403 to a refused request when the access.denied entry cannot be written', async () => {
    await blockActions('access.denied');
    try {
      const res = await request(app).get('/api/audit-logs').set(as(target));

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(await count(`action = 'access.denied'`)).toBe(0);
    } finally {
      await unblock();
    }
  });

  it('refuses a role change, and leaves the role alone, when its audit row cannot be written', async () => {
    await blockActions('user.role.change');
    try {
      const rows = await count(`action = 'user.role.change'`);

      const res = await request(app)
        .patch(`/api/users/${target.id}/role`)
        .set(as(admin))
        .send({ role: 'admin' });

      expect(res.status).toBe(500);
      // The failure is generic to the client: no SQL, constraint or table names.
      expect(JSON.stringify(res.body)).not.toMatch(/audit_logs|constraint|CHECK/i);
      expect(await roleOf(target.id)).toBe('t1_analyst');
      expect(await count(`action = 'user.role.change'`)).toBe(rows);
    } finally {
      await unblock();
    }
  });

  it('refuses a disable, and leaves the account active, when its audit row cannot be written', async () => {
    await blockActions('user.disable');
    try {
      const res = await request(app).post(`/api/users/${other.id}/disable`).set(as(admin));

      expect(res.status).toBe(500);
      expect(await statusOf(other.id)).toBe('active');
      // ...and the user can still use the session they would otherwise have lost.
      await request(app).get('/api/auth/me').set(as(other)).expect(200);
    } finally {
      await unblock();
    }
  });

  it('works normally again once the audit table accepts writes', async () => {
    await request(app)
      .patch(`/api/users/${target.id}/role`)
      .set(as(admin))
      .send({ role: 't2_analyst' })
      .expect(200);

    expect(await roleOf(target.id)).toBe('t2_analyst');
    expect(await count(`action = 'user.role.change' AND target_id = '${target.id}'`)).toBe(1);
  });
});
