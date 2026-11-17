import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { HealthCheckService } from '../../src/infrastructure/services/health-check.service.ts';
import { HealthController } from '../../src/presentation/controllers/health.controller.ts';
import { healthRoutes } from '../../src/presentation/routes/health.routes.ts';
import type { ILogger } from '../../src/application/interfaces/services/logger.interface.ts';
import type { IHealthCheckService } from '../../src/application/interfaces/services/health-check.service.interface.ts';

const fakeLogger = () => {
  const logger = { info: vi.fn(), warn: vi.fn(), child: () => logger } as unknown as ILogger;
  return logger;
};

const up = () => Promise.resolve('PONG');
const down = () => Promise.reject(new Error('ECONNREFUSED'));
const never = () => new Promise<never>(() => {});

const service = (
  database: () => Promise<unknown>,
  redis: () => Promise<string>,
  redisRequired: boolean,
  logger = fakeLogger(),
) =>
  new HealthCheckService({
    pingDatabase: database,
    redis: { ping: redis },
    redisRequired,
    logger,
    timeoutMs: 50,
  });

describe('HealthCheckService', () => {
  it('is healthy when the database and Redis both answer', async () => {
    expect(await service(up, up, true).check()).toEqual({
      healthy: true,
      database: true,
      redis: true,
    });
  });

  it('is unhealthy when the database is down, whatever Redis says', async () => {
    expect((await service(down, up, true).check()).healthy).toBe(false);
    expect((await service(down, up, false).check()).healthy).toBe(false);
  });

  it('is unhealthy without Redis in production, where Redis is part of the install', async () => {
    expect(await service(up, down, true).check()).toEqual({
      healthy: false,
      database: true,
      redis: false,
    });
  });

  it('stays healthy without Redis in development, where the in-memory cache stands in', async () => {
    expect((await service(up, down, false).check()).healthy).toBe(true);
  });

  it('treats a dependency that hangs as down instead of hanging itself', async () => {
    const started = Date.now();
    expect((await service(never, up, true).check()).database).toBe(false);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('logs only when the result changes, not on every poll', async () => {
    const logger = fakeLogger();
    let databaseUp = true;
    const health = service(() => (databaseUp ? up() : down()), up, true, logger);

    await health.check();
    await health.check();
    databaseUp = false;
    await health.check();
    await health.check();

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/health', () => {
  const appWith = (healthy: boolean) => {
    const fake: IHealthCheckService = {
      check: () => Promise.resolve({ healthy, database: healthy, redis: false }),
    };
    return express().use('/api/health', healthRoutes(new HealthController(fake)));
  };

  it('answers 200 with only a status when healthy', async () => {
    const res = await request(appWith(true)).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('answers 503 without saying which dependency failed', async () => {
    const res = await request(appWith(false)).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable' });
    expect(JSON.stringify(res.body)).not.toMatch(/database|redis/i);
  });
});
