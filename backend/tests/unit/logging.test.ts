import { Writable } from 'node:stream';
import express from 'express';
import request from 'supertest';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { baseLoggerOptions, PinoLogger } from '../../src/infrastructure/logging/logger.ts';
import { createHttpLogger } from '../../src/infrastructure/logging/http-logger.ts';

const captureLogger = () => {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      for (const line of String(chunk).split('\n').filter(Boolean)) lines.push(JSON.parse(line));
      done();
    },
  });
  return { logger: pino({ ...baseLoggerOptions, level: 'info' }, stream), lines };
};

const appWith = (logger: ReturnType<typeof captureLogger>['logger']) => {
  const app = express();
  app.use(createHttpLogger(logger));
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/api/auth/invite', (_req, res) => {
    res.status(400).json({});
  });
  app.get('/api/users', (_req, res) => {
    res.json([]);
  });
  return app;
};

describe('logger redaction', () => {
  it('masks secret fields at the top level and one level down', () => {
    const { logger, lines } = captureLogger();
    new PinoLogger(logger).info('Something happened', {
      password: 'hunter2-hunter2',
      token: 'raw-token',
      user: { email: 'a@example.com', newPassword: 'x', refreshToken: 'y' },
      link: 'https://siem.example.com/reset-password?token=abc',
    });

    const entry = lines[0];
    expect(entry).toMatchObject({
      msg: 'Something happened',
      password: '[REDACTED]',
      token: '[REDACTED]',
      link: '[REDACTED]',
      user: { email: 'a@example.com', newPassword: '[REDACTED]', refreshToken: '[REDACTED]' },
    });
    expect(JSON.stringify(entry)).not.toMatch(/hunter2|raw-token|token=abc/);
  });

  it('keeps an error stack under err', () => {
    const { logger, lines } = captureLogger();
    new PinoLogger(logger).error('It broke', { err: new Error('boom') });
    expect(lines[0]?.err).toMatchObject({ type: 'Error', message: 'boom' });
    expect((lines[0]?.err as { stack: string }).stack).toContain('boom');
  });

  it('child loggers add their bindings to every entry', () => {
    const { logger, lines } = captureLogger();
    new PinoLogger(logger).child({ module: 'email' }).warn('Slow');
    expect(lines[0]).toMatchObject({ module: 'email', msg: 'Slow' });
  });
});

describe('HTTP request logging', () => {
  it('logs the path without the query string, so tokens in links never reach the log', async () => {
    const { logger, lines } = captureLogger();
    await request(appWith(logger))
      .get('/api/auth/invite?token=secret-invite-token')
      .set('Cookie', 'refreshToken=secret-cookie')
      .set('Authorization', 'Bearer secret-jwt');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      msg: 'GET /api/auth/invite 400',
      level: 40,
      req: { method: 'GET', path: '/api/auth/invite' },
      res: { statusCode: 400 },
    });
    expect(JSON.stringify(lines[0])).not.toMatch(/secret/);
  });

  it('generates a request id and returns it in X-Request-Id', async () => {
    const { logger, lines } = captureLogger();
    const res = await request(appWith(logger)).get('/api/users');

    const id = res.headers['x-request-id'];
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect((lines[0]?.req as { id: string }).id).toBe(id);
  });

  it('reuses a well-formed incoming request id and replaces a malformed one', async () => {
    const { logger } = captureLogger();
    const app = appWith(logger);

    const kept = await request(app).get('/api/users').set('X-Request-Id', 'proxy-abc.123');
    expect(kept.headers['x-request-id']).toBe('proxy-abc.123');

    const replaced = await request(app).get('/api/users').set('X-Request-Id', 'bad id {"x":1}');
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('does not log health checks', async () => {
    const { logger, lines } = captureLogger();
    await request(appWith(logger)).get('/health');
    expect(lines).toHaveLength(0);
  });
});
