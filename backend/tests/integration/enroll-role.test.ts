import pg from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { DataSource } from 'typeorm';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { syncEnrollRolePassword } from '../../src/infrastructure/database/enroll-role.ts';
import { createEnrollDataSource } from '../../src/enroll/data-source.ts';
import { createEnrollApp } from '../../src/enroll/app.ts';
import { PinoLogger, createRootLogger } from '../../src/infrastructure/logging/pino-logger.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';

const PASSWORD = 'test-enroll-password-0123456789';
const silent = new PinoLogger(
  createRootLogger({ service: 'test', level: 'silent', pretty: false }),
);

// The test database, but logged in as siemple_enroll.
const enrollUrl = (password = PASSWORD): string => {
  const url = new URL(process.env.TEST_DATABASE_URL ?? '');
  url.username = 'siemple_enroll';
  url.password = password;
  return url.toString();
};

const connectAsEnroll = async (password?: string): Promise<pg.Client> => {
  const client = new pg.Client({ connectionString: enrollUrl(password) });
  await client.connect();
  return client;
};

const PERMISSION_DENIED = '42501';

describe('the siemple_enroll role', () => {
  let client: pg.Client;
  let tokenId: string;

  beforeAll(async () => {
    await recreateDatabase();
    await syncEnrollRolePassword(AppDataSource, PASSWORD, silent);
    const [agent] = await AppDataSource.query<{ id: string }[]>(
      `INSERT INTO pending_agents
         (name, group_name, os, arch, wazuh_agent_id, agent_key_ciphertext, agent_key_iv,
          agent_key_auth_tag, key_version)
       VALUES ('web-01', 'default', 'linux-deb', 'x86_64', '007', 'Y2lwaGVy', 'aXY=', 'dGFn', 1)
       RETURNING id`,
    );
    const [token] = await AppDataSource.query<{ id: string }[]>(
      `INSERT INTO enrollment_tokens (pending_agent_id, token_hash, expires_at)
       VALUES ($1, repeat('a', 64), now() + interval '1 hour') RETURNING id`,
      [agent?.id],
    );
    tokenId = token?.id ?? '';
    client = await connectAsEnroll();
  });

  afterAll(async () => {
    await client?.end();
    await closeDatabase();
  });

  it('reads both enrollment tables', async () => {
    const agents = await client.query('SELECT name, status FROM pending_agents');
    expect(agents.rows).toEqual([{ name: 'web-01', status: 'pending' }]);
    const tokens = await client.query('SELECT id, used_at FROM enrollment_tokens');
    expect(tokens.rows).toEqual([{ id: tokenId, used_at: null }]);
  });

  it('marks a link used', async () => {
    const result = await client.query(
      'UPDATE enrollment_tokens SET used_at = now() WHERE id = $1 AND used_at IS NULL',
      [tokenId],
    );
    expect(result.rowCount).toBe(1);
  });

  it.each([
    ['read users', 'SELECT * FROM users'],
    ['read the audit log', 'SELECT * FROM audit_logs'],
    ['read email settings', 'SELECT * FROM email_settings'],
    [
      'create a pending agent',
      `INSERT INTO pending_agents (name, group_name, os, wazuh_agent_id, agent_key_ciphertext,
         agent_key_iv, agent_key_auth_tag, key_version)
       VALUES ('x', 'default', 'windows', '008', 'a', 'b', 'c', 1)`,
    ],
    [
      'create a link',
      `INSERT INTO enrollment_tokens (pending_agent_id, token_hash, expires_at)
       SELECT id, repeat('b', 64), now() FROM pending_agents`,
    ],
    ['change an agent status', `UPDATE pending_agents SET status = 'connected'`],
    ['extend a link', `UPDATE enrollment_tokens SET expires_at = now() + interval '1 year'`],
    ['delete a link', 'DELETE FROM enrollment_tokens'],
    ['delete a pending agent', 'DELETE FROM pending_agents'],
    ['create a table', 'CREATE TABLE stash (x int)'],
  ])('cannot %s', async (_label, sql) => {
    await expect(client.query(sql)).rejects.toMatchObject({ code: PERMISSION_DENIED });
  });

  it('cannot log in once ENROLL_DB_PASSWORD is removed', async () => {
    await syncEnrollRolePassword(AppDataSource, undefined, silent);
    try {
      await expect(connectAsEnroll()).rejects.toThrow(/not permitted to log in/);
    } finally {
      await syncEnrollRolePassword(AppDataSource, PASSWORD, silent);
    }
  });

  it('refuses a password that is not URL-safe', async () => {
    await expect(syncEnrollRolePassword(AppDataSource, "short'pass", silent)).rejects.toThrow(
      /ENROLL_DB_PASSWORD/,
    );
  });

  it('survives running the migrations again while the role already exists', async () => {
    await client.end();
    await recreateDatabase();
    await syncEnrollRolePassword(AppDataSource, PASSWORD, silent);
    client = await connectAsEnroll();
    const tokens = await client.query('SELECT count(*)::int AS n FROM enrollment_tokens');
    expect(tokens.rows[0]).toEqual({ n: 0 });
  });
});

describe('the enrollment service', () => {
  let db: DataSource;

  beforeAll(async () => {
    await recreateDatabase();
    await syncEnrollRolePassword(AppDataSource, PASSWORD, silent);
    db = createEnrollDataSource(enrollUrl());
    await db.initialize();
  });

  afterEach(async () => {
    if (!db.isInitialized) await db.initialize();
  });

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    await closeDatabase();
  });

  it('reports healthy when its database answers', async () => {
    const res = await request(createEnrollApp(db, silent)).get('/enroll/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('reports unavailable when its database does not answer', async () => {
    const app = createEnrollApp(db, silent);
    await db.destroy();
    const res = await request(app).get('/enroll/health');
    expect(res.status).toBe(503);
  });

  it('connects as siemple_enroll, never as the database owner', async () => {
    const [row] = await db.query<{ user: string; app: string }[]>(
      `SELECT current_user AS "user", current_setting('application_name') AS app`,
    );
    expect(row).toEqual({ user: 'siemple_enroll', app: 'siemple-enroll' });
  });

  it('answers 404 with JSON on anything else', async () => {
    const res = await request(createEnrollApp(db, silent)).get('/api/auth/me');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Not found' });
  });
});
