import { describe, expect, it, vi } from 'vitest';
import { connectWithRetry } from '../../src/infrastructure/database/connect-with-retry.ts';
import type { ILogger } from '../../src/application/interfaces/services/logger.interface.ts';

const fakeLogger = () => ({ warn: vi.fn() }) as unknown as ILogger;

const flaky = (failures: number) => {
  let calls = 0;
  return vi.fn(async () => {
    calls++;
    if (calls <= failures) throw new Error('ECONNREFUSED');
  });
};

describe('connectWithRetry', () => {
  it('connects on the first try without waiting', async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const connect = flaky(0);
    await connectWithRetry(connect, fakeLogger(), { sleep });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('waits and retries while the database is starting, doubling the wait up to the cap', async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const logger = fakeLogger();
    const connect = flaky(5);

    await connectWithRetry(connect, logger, {
      sleep,
      initialDelayMs: 1_000,
      maxDelayMs: 5_000,
    });

    expect(connect).toHaveBeenCalledTimes(6);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1_000, 2_000, 4_000, 5_000, 5_000]);
    expect(logger.warn).toHaveBeenCalledTimes(5);
  });

  it('gives up after the last attempt and rethrows the real error', async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const connect = flaky(Infinity);

    await expect(connectWithRetry(connect, fakeLogger(), { sleep, attempts: 3 })).rejects.toThrow(
      'ECONNREFUSED',
    );
    expect(connect).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
