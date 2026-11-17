import { describe, expect, it } from 'vitest';
import { AsyncRequestContext } from '../../src/infrastructure/context/async-request-context.ts';
import type { IRequestScope } from '../../src/application/interfaces/services/request-context.provider.interface.ts';

const scope = (requestId: string): IRequestScope => ({
  requestId,
  ip: '203.0.113.7',
  userAgent: 'test',
  actor: null,
});

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('AsyncRequestContext', () => {
  it('has no scope outside a request', () => {
    expect(new AsyncRequestContext().current()).toBeUndefined();
  });

  it('keeps the scope across awaited work', async () => {
    const context = new AsyncRequestContext();

    const seen = await context.run(scope('r1'), async () => {
      await tick(5);
      return context.current()?.requestId;
    });

    expect(seen).toBe('r1');
  });

  it('keeps concurrent requests apart, including the actor each one signs in as', async () => {
    const context = new AsyncRequestContext();
    const handle = (id: string, delay: number) =>
      context.run(scope(id), async () => {
        await tick(delay);
        context.setActor({ userId: id, username: `user-${id}`, role: 'admin' });
        await tick(delay);
        return { id: context.current()?.requestId, actor: context.current()?.actor?.userId };
      });

    const results = await Promise.all([handle('a', 10), handle('b', 1), handle('c', 5)]);

    expect(results).toEqual([
      { id: 'a', actor: 'a' },
      { id: 'b', actor: 'b' },
      { id: 'c', actor: 'c' },
    ]);
  });

  it('lets later steps of the same request see an actor set earlier', async () => {
    const context = new AsyncRequestContext();

    const actor = await context.run(scope('r1'), async () => {
      context.setActor({ userId: 'u1', username: 'Ann', role: 'admin' });
      await tick(1);
      return context.current()?.actor;
    });

    expect(actor).toEqual({ userId: 'u1', username: 'Ann', role: 'admin' });
  });

  it('ignores setActor outside a request', () => {
    const context = new AsyncRequestContext();
    expect(() => context.setActor({ userId: 'u1', username: 'Ann', role: 'admin' })).not.toThrow();
  });
});
