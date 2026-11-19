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
      level: 'warn',
      method: 'GET',
      route: '/api/auth/invite',
      status: 400,
    });
    expect(JSON.stringify(lines[0])).not.toMatch(/secret/);
  });

  it('generates a request id and returns it in X-Request-Id', async () => {
    const { logger, lines } = captureLogger();
    const res = await request(appWith(logger)).get('/api/users');

    const id = res.headers['x-request-id'];
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(lines[0]?.requestId).toBe(id);
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

  it('writes one flat JSON line per request: requestId, method, route, status, durationMs', async () => {
    const { logger, lines } = captureLogger();
    const res = await request(appWith(logger)).get('/api/users');

    expect(lines).toHaveLength(1);
    const line = lines[0] as Record<string, unknown>;
    expect(line).toMatchObject({
      level: 'info',
      msg: 'GET /api/users 200',
      requestId: res.headers['x-request-id'],
      method: 'GET',
      route: '/api/users',
      status: 200,
    });
    expect(typeof line.timestamp).toBe('string');
    expect(typeof line.durationMs).toBe('number');
    expect(line).not.toHaveProperty('req');
    expect(line).not.toHaveProperty('res');
  });

  // The app mounts every feature as a router (app.use('/api/users', router)); inside one, Express
  // shortens req.url to the part after the mount point and restores baseUrl when the request leaves.
  it('logs the route template, not the raw URL, also for errors handled outside the router', async () => {
    const { logger, lines } = captureLogger();
    const app = express();
    app.use(createHttpLogger(logger));
    const router = express.Router();
    router.post('/complete', (_req, res) => {
      res.status(201).json({});
    });
    router.get('/:id', (_req, res) => {
      res.json({});
    });
    router.delete('/:id', () => {
      throw new Error('boom');
    });
    app.use('/api/setup', router);
    app.use('/api/users', router);
    app.use(
      (
        _err: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res.status(500).json({});
      },
    );

    await request(app).post('/api/setup/complete?x=1');
    await request(app).get('/api/users/0b9c6a5e-1111-4222-8333-444455556666');
    await request(app).delete('/api/users/0b9c6a5e-1111-4222-8333-444455556666');
    await request(app).get('/api/nothing-here/42');

    expect(lines.map((l) => [l.msg, l.route, l.level])).toEqual([
      ['POST /api/setup/complete 201', '/api/setup/complete', 'info'],
      ['GET /api/users/:id 200', '/api/users/:id', 'info'],
      ['DELETE /api/users/:id 500', '/api/users/:id', 'error'],
      ['GET unmatched 404', 'unmatched', 'warn'],
    ]);
    expect(JSON.stringify(lines)).not.toContain('0b9c6a5e');
  });

  it('never logs a login password, cookies, the Authorization header or a setup token', async () => {
    const { logger, lines } = captureLogger();
    const app = express();
    app.use(createHttpLogger(logger));
    app.use(express.json());
    app.post('/api/auth/login', (req, res) => {
      new PinoLogger(logger).info('Login attempt', { body: req.body, headers: req.headers });
      res.status(401).json({});
    });
    app.post('/api/setup/complete', (req, res) => {
      new PinoLogger(logger).info('Setup', { setupToken: req.body.setupToken, user: req.body });
      res.status(400).json({});
    });

    await request(app)
      .post('/api/auth/login')
      .set('Cookie', 'refreshToken=secret-cookie-value')
      .set('Authorization', 'Bearer secret-jwt-value')
      .send({ email: 'a@example.com', password: 'secret-login-password' });
    await request(app)
      .post('/api/setup/complete')
      .send({ setupToken: 'secret-setup-token', password: 'secret-admin-password' });

    expect(lines).toHaveLength(4);
    expect(JSON.stringify(lines)).not.toMatch(/secret-/);
  });
});
