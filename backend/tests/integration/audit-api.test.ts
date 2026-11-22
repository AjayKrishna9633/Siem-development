import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.ts';
import { AppDataSource } from '../../src/infrastructure/database/data-source.ts';
import { closeDatabase, recreateDatabase } from '../helpers/database.ts';
import { addActiveUser, setupFirstAdmin, type ISignedInUser } from '../helpers/users.ts';

const as = (user: ISignedInUser) => ({ Authorization: `Bearer ${user.token}` });

interface IEntryDto {
  id: string;
  occurredAt: string;
  actor: { id: string | null; username: string | null; role: string | null };
  action: string;
  category: string;
  outcome: string;
  target: { type: string | null; id: string | null; label: string | null };
  metadata: Record<string, unknown>;
}

interface IPageBody {
  data: { items: IEntryDto[]; nextCursor: string | null };
}

const BASE = new Date(Math.floor((Date.now() - 3_600_000) / 1000) * 1000).toISOString();

const insertRows = async (action: string, micros: number[]) => {
  await AppDataSource.query(
    `INSERT INTO audit_logs (occurred_at, action, category, outcome)
     SELECT $3::timestamptz + (m || ' microseconds')::interval, $1, 'system', 'success'
       FROM unnest($2::int[]) AS m`,
    [action, micros, BASE],
  );
};

const walk = async (admin: ISignedInUser, query: string, limit: number) => {
  const ids: string[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const res = await request(app)
      .get(`/api/audit-logs?${query}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`)
      .set(as(admin))
      .expect(200);
    const body = res.body as IPageBody;
    ids.push(...body.data.items.map((i) => i.id));
    cursor = body.data.nextCursor;
    pages += 1;
  } while (cursor && pages < 100);
  return ids;
};

describe('audit log API', () => {
  let admin: ISignedInUser;
  let analyst: ISignedInUser;

  beforeAll(async () => {
    await recreateDatabase();
    admin = await setupFirstAdmin(app);
    analyst = await addActiveUser(app, admin, 'tier1@example.com', 't1_analyst');
  });
  afterAll(closeDatabase);

  describe('access', () => {
    it.each(['/api/audit-logs', '/api/audit-logs/export?format=csv'])(
      'refuses an unauthenticated caller on %s',
      async (path) => {
        await request(app).get(path).expect(401);
      },
    );

    it('refuses analysts on every route and records each refusal', async () => {
      const id = '0b2f4a52-1111-4222-8333-444455556666';
      for (const path of ['/api/audit-logs', `/api/audit-logs/${id}`, '/api/audit-logs/export']) {
        const res = await request(app).get(path).set(as(analyst));
        expect(res.status, path).toBe(403);
      }

      const rows = await AppDataSource.query<{ actor_id: string; metadata: { path: string } }[]>(
        `SELECT actor_id, metadata FROM audit_logs WHERE action = 'access.denied' AND actor_id = $1`,
        [analyst.id],
      );
      expect(rows.map((r) => r.metadata.path).sort()).toEqual(
        ['/api/audit-logs', `/api/audit-logs/${id}`, '/api/audit-logs/export'].sort(),
      );
    });
  });

  describe('listing', () => {
    it('returns entries newest first, with actor and target as nested objects', async () => {
      const res = await request(app).get('/api/audit-logs').set(as(admin)).expect(200);
      const items = (res.body as IPageBody).data.items;

      expect(items.length).toBeGreaterThan(0);
      const times = items.map((i) => i.occurredAt);
      expect(times).toEqual([...times].sort().reverse());

      const completed = items.find((i) => i.action === 'system.setup.completed');
      expect(completed).toMatchObject({
        category: 'system',
        outcome: 'success',
        actor: { id: admin.id, username: 'First Admin', role: 'admin' },
        target: { type: 'user', id: admin.id, label: 'admin@example.com' },
      });
      expect(completed?.occurredAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/);
    });

    it('filters by category, outcome, action, actor and free text', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever-it-is-123' })
        .expect(401);

      const get = async (query: string) =>
        (
          (await request(app).get(`/api/audit-logs?${query}`).set(as(admin)).expect(200))
            .body as IPageBody
        ).data.items;

      const failures = await get('outcome=failure');
      expect(failures.length).toBeGreaterThan(0);
      expect(failures.every((i) => i.outcome === 'failure')).toBe(true);

      expect(
        (await get('action=auth.login.failure')).every((i) => i.action === 'auth.login.failure'),
      ).toBe(true);
      expect((await get('category=user')).every((i) => i.category === 'user')).toBe(true);
      expect((await get(`actorId=${admin.id}`)).every((i) => i.actor.id === admin.id)).toBe(true);

      expect((await get('q=nobody')).length).toBe(0);
      const named = await get('q=first%20admin');
      expect(named.length).toBeGreaterThan(0);
      expect(named.every((i) => i.actor.username === 'First Admin')).toBe(true);
      expect(
        (await get('q=admin%40example.com')).every((i) => i.target.label === 'admin@example.com'),
      ).toBe(true);
    });

    it('treats an empty filter as not set', async () => {
      await request(app)
        .get('/api/audit-logs?category=&outcome=&q=&from=&to=')
        .set(as(admin))
        .expect(200);
    });

    it('searches literally, so % does not match everything', async () => {
      const res = await request(app).get('/api/audit-logs?q=%25').set(as(admin)).expect(200);
      expect((res.body as IPageBody).data.items).toHaveLength(0);
    });
  });

  describe('pagination', () => {
    it('walks rows that share an exact timestamp without repeating or skipping any', async () => {
      await insertRows('test.ties', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

      const ids = await walk(admin, 'action=test.ties', 5);

      expect(ids).toHaveLength(12);
      expect(new Set(ids).size).toBe(12);
    });

    it('keeps order and loses nothing when rows differ only in microseconds', async () => {
      await insertRows('test.micros', [100, 200, 300, 400, 500, 600, 700]);

      const ids = await walk(admin, 'action=test.micros', 1);

      const expected = await AppDataSource.query<{ id: string }[]>(
        `SELECT id FROM audit_logs WHERE action = 'test.micros' ORDER BY occurred_at DESC, id DESC`,
      );
      expect(ids).toHaveLength(7);
      expect(ids).toEqual(expected.map((r) => r.id));
    });

    it('is not disturbed by rows written while paging', async () => {
      await insertRows('test.live', [0, 10, 20, 30, 40, 50]);
      const first = await request(app)
        .get('/api/audit-logs?action=test.live&limit=2')
        .set(as(admin))
        .expect(200);
      const seen = (first.body as IPageBody).data.items.map((i) => i.id);
      const cursor = (first.body as IPageBody).data.nextCursor;
      expect(seen).toHaveLength(2);

      await AppDataSource.query(
        `INSERT INTO audit_logs (action, category, outcome) VALUES ('test.live', 'system', 'success')`,
      );
      await insertRows('test.live', [25]);

      const next = await request(app)
        .get(`/api/audit-logs?action=test.live&limit=100&cursor=${cursor}`)
        .set(as(admin))
        .expect(200);
      const later = (next.body as IPageBody).data.items.map((i) => i.id);

      expect(later.filter((id) => seen.includes(id))).toEqual([]);
      expect(later).toHaveLength(5);
    });

    it('reports no next cursor on the last page', async () => {
      const res = await request(app)
        .get('/api/audit-logs?action=test.micros&limit=100')
        .set(as(admin))
        .expect(200);
      expect((res.body as IPageBody).data.nextCursor).toBeNull();
    });
  });

  describe('validation', () => {
    it.each([
      [
        'a range over 90 days',
        'from=2026-01-01T00:00:00Z&to=2026-06-01T00:00:00Z',
        /at most 90 days/,
      ],
      [
        'a range ending before it starts',
        'from=2026-06-01T00:00:00Z&to=2026-01-01T00:00:00Z',
        /before its end/,
      ],
      ['a malformed date', 'from=yesterday', /ISO 8601/],
      ['an unknown category', 'category=bogus', /Unknown category/],
      ['an unknown outcome', 'outcome=maybe', /Unknown outcome/],
      ['a bad actor id', 'actorId=not-a-uuid', /actorId/],
      ['an action with odd characters', `action=${encodeURIComponent("a'; drop")}`, /lowercase/],
      ['a limit over the maximum', 'limit=500', /200/],
      ['a limit of zero', 'limit=0', /./],
      ['a cursor that is not one', 'cursor=garbage', /cursor/i],
    ])('rejects %s with 400', async (_name, query, message) => {
      const res = await request(app).get(`/api/audit-logs?${query}`).set(as(admin));
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(message);
    });

    it('rejects an unsupported export format', async () => {
      await request(app).get('/api/audit-logs/export?format=xml').set(as(admin)).expect(400);
    });
  });

  describe('single entry', () => {
    it('returns an entry by id', async () => {
      const [row] = await AppDataSource.query<{ id: string }[]>(
        `SELECT id FROM audit_logs WHERE action = 'system.setup.completed'`,
      );
      const res = await request(app).get(`/api/audit-logs/${row?.id}`).set(as(admin)).expect(200);
      expect(res.body.data).toMatchObject({ id: row?.id, action: 'system.setup.completed' });
    });

    it('returns 404 for an id that does not exist and 400 for one that is not an id', async () => {
      const missing = await request(app)
        .get('/api/audit-logs/0b2f4a52-1111-4222-8333-444455556666')
        .set(as(admin));
      expect(missing.status).toBe(404);
      expect(missing.body.code).toBe('AUDIT_LOG_NOT_FOUND');
      await request(app).get('/api/audit-logs/not-a-uuid').set(as(admin)).expect(400);
    });
  });

  describe('CSV export', () => {
    it('streams a CSV with a header, the filtered rows, and a download filename', async () => {
      const res = await request(app)
        .get('/api/audit-logs/export?format=csv&action=test.micros')
        .set(as(admin))
        .expect(200);

      expect(res.headers['content-type']).toMatch(/^text\/csv/);
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="audit-logs-\d{8}-\d{4}\.csv"/,
      );
      expect(res.headers['cache-control']).toBe('no-store');

      const lines = res.text
        .replace(/^\uFEFF/, '')
        .trimEnd()
        .split('\r\n');
      expect(lines[0]).toBe(
        'occurred_at,actor_username,actor_role,actor_id,action,category,outcome,target_type,target_id,target_label,ip_address,user_agent,request_id,metadata,id',
      );
      expect(lines).toHaveLength(1 + 7);
      expect(lines.slice(1).every((l) => l.includes(',test.micros,'))).toBe(true);
    });

    it('neutralises spreadsheet formulas in text an outsider controls', async () => {
      await AppDataSource.query(
        `INSERT INTO audit_logs (action, category, outcome, actor_username)
         VALUES ('test.csv', 'auth', 'failure', '=HYPERLINK("http://evil.test","x")')`,
      );

      const res = await request(app)
        .get('/api/audit-logs/export?action=test.csv')
        .set(as(admin))
        .expect(200);

      expect(res.text).toContain(`"'=HYPERLINK(""http://evil.test"",""x"")"`);
      expect(res.text).not.toMatch(/(^|,)=HYPERLINK/m);
    });

    it('records the export itself, with the filters and row count', async () => {
      await request(app)
        .get('/api/audit-logs/export?format=csv&action=test.micros&outcome=success')
        .set(as(admin))
        .set('X-Request-Id', 'req-export-1')
        .expect(200);

      const [row] = await AppDataSource.query<
        { actor_id: string; category: string; metadata: Record<string, unknown> }[]
      >(`SELECT * FROM audit_logs WHERE action = 'audit.export' AND request_id = 'req-export-1'`);

      expect(row).toMatchObject({
        actor_id: admin.id,
        category: 'system',
        metadata: { format: 'csv', rowCount: 7, action: 'test.micros', outcome: 'success' },
      });
    });
  });

  describe('oversized export', () => {
    it('refuses with 400 before streaming, and records nothing for the refused export', async () => {
      await AppDataSource.query(
        `INSERT INTO audit_logs (occurred_at, action, category, outcome)
         SELECT now() - interval '2 hours', 'test.bulk', 'system', 'success'
           FROM generate_series(1, 100001)`,
      );
      const before = await AppDataSource.query<{ n: number }[]>(
        `SELECT count(*)::int n FROM audit_logs WHERE action = 'audit.export'`,
      );

      const res = await request(app)
        .get('/api/audit-logs/export?format=csv&action=test.bulk')
        .set(as(admin));

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body.message).toMatch(/too large/i);

      const after = await AppDataSource.query<{ n: number }[]>(
        `SELECT count(*)::int n FROM audit_logs WHERE action = 'audit.export'`,
      );
      expect(after[0]?.n).toBe(before[0]?.n);
    }, 60_000);
  });

  it('does not write audit rows just for reading the log', async () => {
    const count = async () =>
      (await AppDataSource.query<{ n: number }[]>(`SELECT count(*)::int n FROM audit_logs`))[0]?.n;
    const before = await count();
    await request(app).get('/api/audit-logs').set(as(admin)).expect(200);
    expect(await count()).toBe(before);
  });
});
