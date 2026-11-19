import { describe, expect, it } from 'vitest';
import { LokiStream } from '../../src/infrastructure/logging/loki-stream.ts';

interface PushedStream {
  stream: Record<string, string>;
  values: [string, string, Record<string, string>?][];
}

// A fake Loki: records each push and answers with the next queued status (or throws).
const fakeLoki = (...responses: (number | Error)[]) => {
  const pushes: { url: string; streams: PushedStream[] }[] = [];
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    const next = responses.shift() ?? 204;
    if (next instanceof Error) throw next;
    pushes.push({
      url: String(url),
      streams: (JSON.parse(String(init?.body)) as { streams: PushedStream[] }).streams,
    });
    return new Response(next === 204 ? null : 'entry too far behind', { status: next });
  }) as typeof fetch;
  return { fetchFn, pushes };
};

const makeStream = (
  fetchFn: typeof fetch,
  extra: { maxBuffered?: number; maxBatch?: number } = {},
) => {
  const warnings: string[] = [];
  const stream = new LokiStream({
    url: 'http://loki:3100',
    labels: { service: 'siemple-backend', environment: 'test' },
    flushIntervalMs: 60_000, // the tests flush by hand
    fetch: fetchFn,
    warn: (m) => warnings.push(m),
    ...extra,
  });
  return { stream, warnings };
};

const line = (level: number, msg: string, extra: Record<string, unknown> = {}) =>
  `${JSON.stringify({ level, time: '2026-11-18T10:00:00.123Z', msg, ...extra })}\n`;

const write = (stream: LokiStream, chunk: string) =>
  new Promise<void>((resolve, reject) =>
    stream.write(chunk, (err) => (err ? reject(err) : resolve())),
  );

describe('LokiStream', () => {
  it('pushes lines to Loki with labels, a nanosecond timestamp and the request id', async () => {
    const loki = fakeLoki();
    const { stream } = makeStream(loki.fetchFn);

    await write(stream, line(30, 'GET /api/users 200', { req: { id: 'req-1' } }));
    await stream.flush();

    expect(loki.pushes).toHaveLength(1);
    expect(loki.pushes[0]?.url).toBe('http://loki:3100/loki/api/v1/push');
    const [pushed] = loki.pushes[0]?.streams ?? [];
    expect(pushed?.stream).toEqual({
      service: 'siemple-backend',
      environment: 'test',
      level: 'info',
    });
    const [ts, text, meta] = pushed?.values[0] ?? [];
    expect(ts).toBe(`${Date.parse('2026-11-18T10:00:00.123Z')}000000`);
    expect(ts).toHaveLength(19);
    expect(JSON.parse(text ?? '{}')).toMatchObject({ msg: 'GET /api/users 200' });
    expect(meta).toEqual({ request_id: 'req-1' });
  });

  it('groups lines into one stream per level', async () => {
    const loki = fakeLoki();
    const { stream } = makeStream(loki.fetchFn);

    await write(stream, line(30, 'a') + line(50, 'b') + line(30, 'c') + line(40, 'd'));
    await stream.flush();

    const streams = loki.pushes[0]?.streams ?? [];
    const levels = Object.fromEntries(streams.map((s) => [s.stream.level, s.values.length]));
    expect(levels).toEqual({ info: 2, error: 1, warn: 1 });
    // No request id: plain [timestamp, line] pairs.
    expect(streams[0]?.values[0]).toHaveLength(2);
  });

  it('keeps the lines while Loki is unreachable and sends them once it is back', async () => {
    const loki = fakeLoki(new Error('connect ECONNREFUSED'), 503, 204);
    const { stream, warnings } = makeStream(loki.fetchFn);

    await write(stream, line(30, 'during startup'));
    await stream.flush(); // refused
    await write(stream, line(30, 'still starting'));
    await stream.flush(); // 503
    expect(stream.buffered).toBe(2);
    expect(warnings).toHaveLength(1); // one warning for the whole outage
    expect(warnings[0]).toMatch(/Can't send logs to Loki \(connect ECONNREFUSED\)/);

    await stream.flush(); // back
    expect(stream.buffered).toBe(0);
    const sent = loki.pushes.at(-1)?.streams[0]?.values.map((v) => JSON.parse(v[1]).msg);
    expect(sent).toEqual(['during startup', 'still starting']);
    expect(warnings[1]).toMatch(/again; nothing was lost/);
  });

  it('drops the oldest lines beyond maxBuffered and says how many were lost', async () => {
    const loki = fakeLoki(new Error('down'), 204);
    const { stream, warnings } = makeStream(loki.fetchFn, { maxBuffered: 3 });

    await write(stream, ['1', '2', '3', '4', '5'].map((m) => line(30, m)).join(''));
    await stream.flush(); // fails, all 3 kept
    await stream.flush();

    const sent = loki.pushes.at(-1)?.streams[0]?.values.map((v) => JSON.parse(v[1]).msg);
    expect(sent).toEqual(['3', '4', '5']);
    expect(warnings.at(-1)).toMatch(/2 lines were dropped/);
  });

  it('gives up on lines Loki rejects instead of retrying them forever', async () => {
    const loki = fakeLoki(400);
    const { stream, warnings } = makeStream(loki.fetchFn);

    await write(stream, line(30, 'too old'));
    await stream.flush();

    expect(stream.buffered).toBe(0);
    expect(warnings[0]).toMatch(/Loki rejected 1 log lines \(HTTP 400\): entry too far behind/);
  });

  it('sends in batches of maxBatch', async () => {
    const loki = fakeLoki();
    const { stream } = makeStream(loki.fetchFn, { maxBatch: 2 });

    await write(stream, ['1', '2', '3', '4', '5'].map((m) => line(30, m)).join(''));
    await stream.flush();

    expect(loki.pushes.map((p) => p.streams[0]?.values.length)).toEqual([2, 2, 1]);
  });

  it('ignores lines that are not JSON', async () => {
    const loki = fakeLoki();
    const { stream } = makeStream(loki.fetchFn);

    await write(stream, 'not json\n');
    await stream.flush();

    expect(loki.pushes).toHaveLength(0);
  });
});
