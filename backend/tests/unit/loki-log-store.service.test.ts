import { describe, expect, it } from 'vitest';
import { LokiLogStoreService } from '../../src/infrastructure/services/loki-log-store.service.ts';
import type { ILogEntry } from '../../src/application/interfaces/services/log-store.service.interface.ts';
import type { ILogger } from '../../src/application/interfaces/services/logger.interface.ts';
import { AppError } from '../../src/domain/errors/AppError.ts';

const silent: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silent,
};

const fakeFetch = (answer: number | Error, body = '') => {
  const calls: { url: string; body: unknown }[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    if (answer instanceof Error) throw answer;
    return new Response(answer === 204 ? null : body, { status: answer });
  }) as typeof fetch;
  return { fn, calls };
};

const TS = `${Date.parse('2026-11-18T10:00:00.500Z')}000000`;

const entry = (level: string, line: string, extra: Partial<ILogEntry> = {}): ILogEntry => ({
  labels: { service: 'ingest', source: 'billing', level },
  timestamp: new Date('2026-11-18T10:00:00.500Z'),
  line,
  ...extra,
});

const errorOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return err as AppError;
  }
  throw new Error('expected a rejection');
};

describe('LokiLogStoreService', () => {
  it('groups entries into one stream per label set, in order, with metadata', async () => {
    const fake = fakeFetch(204);
    const store = new LokiLogStoreService({
      url: 'http://loki:3100',
      logger: silent,
      fetch: fake.fn,
    });

    await store.push([
      entry('info', 'a', { metadata: { request_id: 'r1' } }),
      entry('error', 'b'),
      entry('info', 'c'),
    ]);

    expect(fake.calls[0]?.url).toBe('http://loki:3100/loki/api/v1/push');
    expect(fake.calls[0]?.body).toEqual({
      streams: [
        {
          stream: { level: 'info', service: 'ingest', source: 'billing' },
          values: [
            [TS, 'a', { request_id: 'r1' }],
            [TS, 'c'],
          ],
        },
        {
          stream: { level: 'error', service: 'ingest', source: 'billing' },
          values: [[TS, 'b']],
        },
      ],
    });
  });

  it('sends nothing for an empty batch', async () => {
    const fake = fakeFetch(204);
    await new LokiLogStoreService({ url: 'http://loki:3100', logger: silent, fetch: fake.fn }).push(
      [],
    );
    expect(fake.calls).toHaveLength(0);
  });

  it.each([
    ['no LOKI_URL', undefined, 204],
    ['a network error', 'http://loki:3100', new Error('ECONNREFUSED')],
    ['Loki starting up (503)', 'http://loki:3100', 503],
    ['Loki overloaded (429)', 'http://loki:3100', 429],
  ] as const)('reports %s as unavailable, so the sender retries', async (_label, url, answer) => {
    const store = new LokiLogStoreService({ url, logger: silent, fetch: fakeFetch(answer).fn });
    const err = await errorOf(store.push([entry('info', 'x')]));
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('LOG_STORE_UNAVAILABLE');
  });

  it('reports events Loki refuses as rejected, with its reason', async () => {
    const store = new LokiLogStoreService({
      url: 'http://loki:3100',
      logger: silent,
      fetch: fakeFetch(400, 'entry too far behind').fn,
    });
    const err = await errorOf(store.push([entry('info', 'x')]));
    expect(err.code).toBe('LOG_STORE_REJECTED');
    expect(err.message).toMatch(/entry too far behind/);
  });
});
