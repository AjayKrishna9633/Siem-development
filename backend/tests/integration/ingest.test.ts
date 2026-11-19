import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ISignedInUser } from '../helpers/users.ts';

interface IPushedStream {
  stream: Record<string, string>;
  values: [string, string, Record<string, string>?][];
}

// A stand-in for Loki: records every push and answers with `status`.
const fakeLoki = {
  status: 204,
  pushes: [] as IPushedStream[][],
  server: null as Server | null,
};

describe('POST /api/ingest', () => {
  let app: Express;
  let admin: ISignedInUser;
  let key: string;
  let keyId: string;
  let query: <T>(sql: string, params?: unknown[]) => Promise<T>;
  let closeDatabase: () => Promise<void>;

  const send = (body: unknown, secret = key) =>
    request(app)
      .post('/api/ingest')
      .set('Authorization', `Bearer ${secret}`)
      .send(body as object);
  const lastPush = () => fakeLoki.pushes.at(-1) ?? [];

  beforeAll(async () => {
    fakeLoki.server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        if (req.url === '/loki/api/v1/push') {
          fakeLoki.pushes.push((JSON.parse(body) as { streams: IPushedStream[] }).streams);
        }
        res.writeHead(fakeLoki.status).end(fakeLoki.status === 400 ? 'entry too far behind' : '');
      });
    });
    await new Promise<void>((resolve) => fakeLoki.server!.listen(0, '127.0.0.1', resolve));
    const { port } = fakeLoki.server.address() as AddressInfo;
    // Read when the app is first imported, so set it before the imports below.
    process.env.LOKI_URL = `http://127.0.0.1:${port}`;

    app = (await import('../../src/app.ts')).default;
    const db = await import('../helpers/database.ts');
    const users = await import('../helpers/users.ts');
    const { AppDataSource } = await import('../../src/infrastructure/database/data-source.ts');
    query = (sql, params) => AppDataSource.query(sql, params);
    closeDatabase = db.closeDatabase;

    await db.recreateDatabase();
    admin = await users.setupFirstAdmin(app);
    const created = await request(app)
      .post('/api/ingest-keys')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'billing-api' });
    key = created.body.data.secret;
    keyId = created.body.data.key.id;
  });

  afterAll(async () => {
    await closeDatabase();
    await new Promise((resolve) => fakeLoki.server?.close(resolve));
  });

  beforeEach(() => {
    fakeLoki.status = 204;
  });

  it('stores events in Loki labelled with the key name and level', async () => {
    const res = await send({
      events: [
        {
          timestamp: '2026-11-18T10:00:00.250Z',
          level: 'error',
          message: 'Payment failed',
          fields: { orderId: 42, user: { id: 'u1' }, message: 'cannot replace the message' },
        },
        { message: 'No level or time given' },
      ],
    });

    expect(res.status).toBe(202);
    expect(res.body.data).toEqual({ accepted: 2 });

    const streams = lastPush();
    const error = streams.find((s) => s.stream.level === 'error');
    const info = streams.find((s) => s.stream.level === 'info');
    expect(error?.stream).toEqual({ level: 'error', service: 'ingest', source: 'billing-api' });
    expect(error?.values[0]?.[0]).toBe(`${Date.parse('2026-11-18T10:00:00.250Z')}000000`);
    expect(JSON.parse(error?.values[0]?.[1] ?? '{}')).toEqual({
      message: 'Payment failed',
      orderId: 42,
      user: { id: 'u1' },
    });
    // The request id ties the events to the API's own log line for this request.
    expect(error?.values[0]?.[2]).toEqual({ request_id: res.headers['x-request-id'] });

    // No timestamp: the time it arrived.
    const arrived = Number(BigInt(info?.values[0]?.[0] ?? '0') / 1_000_000n);
    expect(Math.abs(arrived - Date.now())).toBeLessThan(60_000);
  });

  it('accepts a timestamp in milliseconds since 1970', async () => {
    const ms = Date.now() - 5_000;
    expect((await send({ events: [{ timestamp: ms, message: 'x' }] })).status).toBe(202);
    expect(lastPush()[0]?.values[0]?.[0]).toBe(`${ms}000000`);
  });

  it.each([
    ['no key', ''],
    ['a malformed key', 'not-a-key'],
    ['an unknown key', `siemple_ik_${'0'.repeat(64)}`],
  ])('refuses %s with 401', async (_label, secret) => {
    const pushes = fakeLoki.pushes.length;
    const res = await send({ events: [{ message: 'x' }] }, secret);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_INGEST_KEY');
    expect(fakeLoki.pushes.length).toBe(pushes);
  });

  it('refuses a user session token: only ingest keys work here', async () => {
    expect((await send({ events: [{ message: 'x' }] }, admin.token)).status).toBe(401);
  });

  it.each([
    ['no events', { events: [] }],
    ['not an array', { events: 'nope' }],
    ['an empty message', { events: [{ message: '' }] }],
    ['an unknown level', { events: [{ message: 'x', level: 'loud' }] }],
    ['a time without a zone', { events: [{ message: 'x', timestamp: '2026-11-18T10:00:00' }] }],
    ['a time 8 days ago', { events: [{ message: 'x', timestamp: Date.now() - 8 * 86_400_000 }] }],
    ['a time an hour ahead', { events: [{ message: 'x', timestamp: Date.now() + 3_600_000 }] }],
    ['too many events', { events: Array.from({ length: 1001 }, () => ({ message: 'x' })) }],
  ])('refuses a body with %s, storing nothing', async (_label, body) => {
    const pushes = fakeLoki.pushes.length;
    const res = await send(body);

    expect(res.status).toBe(400);
    expect(fakeLoki.pushes.length).toBe(pushes);
  });

  it('names the event that failed validation', async () => {
    const res = await send({ events: [{ message: 'ok' }, { message: 'x', level: 'loud' }] });
    expect(res.body.data).toEqual([expect.objectContaining({ field: 'events.1.level' })]);
  });

  it('refuses an event whose stored line would be over 64 KB', async () => {
    const fields = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`f${i}`, 'x'.repeat(7000)]),
    );
    const res = await send({ events: [{ message: 'big', fields }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/events\.0/);
  });

  it('accepts batches bigger than the 100 KB limit the rest of the API has', async () => {
    const events = Array.from({ length: 200 }, (_, i) => ({ message: `${i} ${'y'.repeat(900)}` }));
    const res = await send({ events });

    expect(res.status).toBe(202);
    expect(res.body.data.accepted).toBe(200);
  });

  it('answers 413 above 1 MB', async () => {
    const events = Array.from({ length: 40 }, () => ({ message: 'z'.repeat(30_000) }));
    expect((await send({ events })).status).toBe(413);
  });

  it('answers 503 when Loki is down, so the sender retries', async () => {
    fakeLoki.status = 503;
    const res = await send({ events: [{ message: 'x' }] });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('LOG_STORE_UNAVAILABLE');
  });

  it('passes on why Loki refused events', async () => {
    fakeLoki.status = 400;
    const res = await send({ events: [{ message: 'x' }] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('LOG_STORE_REJECTED');
    expect(res.body.message).toMatch(/entry too far behind/);
  });

  it('records when the key was last used', async () => {
    const [row] = await query<{ last_used_at: Date | null }[]>(
      'SELECT last_used_at FROM ingest_keys WHERE id = $1',
      [keyId],
    );
    expect(row?.last_used_at).not.toBeNull();
  });

  it('stops accepting a key the moment it is revoked', async () => {
    await request(app)
      .delete(`/api/ingest-keys/${keyId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const res = await send({ events: [{ message: 'after revoke' }] });
    expect(res.status).toBe(401);
  });
});
