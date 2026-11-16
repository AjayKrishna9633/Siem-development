import { describe, expect, it, vi } from 'vitest';
import { AuditService } from '../../src/infrastructure/services/audit.service.ts';
import { AsyncRequestContext } from '../../src/infrastructure/context/async-request-context.ts';
import { SYSTEM_ACTOR } from '../../src/domain/constants/audit.ts';
import { AuditAction, AuditTargetType } from '../../src/domain/enums/AuditAction.ts';
import { AuditCategory } from '../../src/domain/enums/AuditCategory.ts';
import { AuditOutcome } from '../../src/domain/enums/AuditOutcome.ts';
import type {
  IAuditLogRepository,
  IAuditRecord,
} from '../../src/application/interfaces/repositories/audit-log.repository.interface.ts';
import type { ILogger } from '../../src/application/interfaces/services/logger.interface.ts';
import type { IRequestScope } from '../../src/application/interfaces/services/request-context.provider.interface.ts';

const admin = { userId: 'u1', username: 'Ann', role: 'admin' };

// AuditService only writes; the read side of the repository is never called here.
const readsNotUsed = { findPage: vi.fn(), findById: vi.fn(), countUpTo: vi.fn() };

const setup = (options: { insertFails?: boolean } = {}) => {
  const inserted: IAuditRecord[] = [];
  const repository: IAuditLogRepository = {
    ...readsNotUsed,
    insert: async (record) => {
      if (options.insertFails) throw new Error('connection lost');
      inserted.push(record);
    },
  };
  const logger = { error: vi.fn(), child: () => logger } as unknown as ILogger;
  const context = new AsyncRequestContext();
  const service = new AuditService(repository, context, logger);
  const inRequest = <T>(fn: () => T, overrides: Partial<IRequestScope> = {}): T =>
    context.run(
      {
        requestId: 'req-1',
        ip: '203.0.113.7',
        userAgent: 'vitest',
        actor: admin,
        ...overrides,
      },
      fn,
    );
  return { service, inserted, logger, inRequest };
};

describe('AuditService.prepare', () => {
  it('fills actor, address and request id from the request, and the category from the action', () => {
    const { service, inRequest } = setup();

    const record = inRequest(() =>
      service.prepare({
        action: AuditAction.USER_ROLE_CHANGED,
        targetType: AuditTargetType.USER,
        targetId: 'u2',
        targetLabel: 't1@x.co',
        metadata: { from: 't1_analyst', to: 'admin' },
      }),
    );

    expect(record).toEqual({
      actorId: 'u1',
      actorUsername: 'Ann',
      actorRole: 'admin',
      action: 'user.role.change',
      category: AuditCategory.USER,
      outcome: AuditOutcome.SUCCESS,
      targetType: 'user',
      targetId: 'u2',
      targetLabel: 't1@x.co',
      ipAddress: '203.0.113.7',
      userAgent: 'vitest',
      requestId: 'req-1',
      metadata: { from: 't1_analyst', to: 'admin' },
    });
  });

  it('prefers an explicit actor over the request actor (a login is not yet authenticated)', () => {
    const { service, inRequest } = setup();

    const record = inRequest(
      () =>
        service.prepare({
          action: AuditAction.LOGIN_SUCCEEDED,
          actor: { userId: 'u9', username: 'Bob', role: 't1_analyst' },
        }),
      { actor: null },
    );

    expect(record).toMatchObject({ actorId: 'u9', actorUsername: 'Bob', actorRole: 't1_analyst' });
  });

  it('records an explicit null actor as anonymous even when the request has one', () => {
    const { service, inRequest } = setup();

    const record = inRequest(() =>
      service.prepare({ action: AuditAction.LOGIN_FAILED, actor: null }),
    );

    expect(record).toMatchObject({ actorId: null, actorUsername: null, actorRole: null });
  });

  it('writes the system actor for CLI work, outside any request', () => {
    const { service } = setup();

    const record = service.prepare({
      action: AuditAction.SETUP_COMPLETED,
      actor: SYSTEM_ACTOR,
    });

    expect(record).toMatchObject({
      actorId: null,
      actorUsername: 'system',
      actorRole: null,
      ipAddress: null,
      userAgent: null,
      requestId: null,
    });
  });

  it('redacts secrets in the metadata', () => {
    const { service, inRequest } = setup();

    const record = inRequest(() =>
      service.prepare({
        action: AuditAction.PASSWORD_CHANGED,
        metadata: { email: 'a@x.co', newPassword: 'hunter2', nested: { token: 't' } },
      }),
    );

    expect(record.metadata).toEqual({
      email: 'a@x.co',
      newPassword: '[REDACTED]',
      nested: { token: '[REDACTED]' },
    });
  });

  it('clips values to the column widths instead of letting the insert fail', () => {
    const { service, inRequest } = setup();

    const record = inRequest(
      () =>
        service.prepare({
          action: AuditAction.LOGIN_FAILED,
          targetLabel: 'x'.repeat(400),
          targetId: 'y'.repeat(100),
        }),
      { userAgent: 'u'.repeat(900), requestId: 'r'.repeat(300) },
    );

    expect(record.targetLabel).toHaveLength(255);
    expect(record.targetId).toHaveLength(64);
    expect(record.userAgent).toHaveLength(512);
    expect(record.requestId).toHaveLength(128);
  });

  it('marks failures and denials when told to', () => {
    const { service } = setup();
    const record = service.prepare({
      action: AuditAction.LOGIN_FAILED,
      outcome: AuditOutcome.FAILURE,
    });
    expect(record.outcome).toBe('failure');
  });
});

describe('AuditService.record', () => {
  it('writes the prepared row', async () => {
    const { service, inserted, inRequest } = setup();

    await inRequest(() => service.record({ action: AuditAction.LOGGED_OUT }));

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ action: 'auth.logout', actorId: 'u1', requestId: 'req-1' });
  });

  it('swallows a failed write and logs it, so the request is not broken by its own audit', async () => {
    const { service, logger, inRequest } = setup({ insertFails: true });

    await expect(
      inRequest(() =>
        service.record({
          action: AuditAction.USER_DISABLED,
          targetType: AuditTargetType.USER,
          targetId: 'u2',
          metadata: { email: 'private@x.co' },
        }),
      ),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [message, fields] = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0] ?? [];
    expect(message).toBe('audit write failed');
    expect(fields).toMatchObject({ action: 'user.disable', targetId: 'u2' });
    expect(JSON.stringify(fields)).not.toContain('private@x.co');
  });

  it('also swallows a failure while building the row', async () => {
    const insert = vi.fn();
    const logger = { error: vi.fn(), child: () => logger } as unknown as ILogger;
    const brokenContext = {
      run: vi.fn(),
      setActor: vi.fn(),
      current: () => {
        throw new Error('context unavailable');
      },
    };
    const service = new AuditService({ ...readsNotUsed, insert }, brokenContext, logger);

    await expect(service.record({ action: AuditAction.LOGGED_OUT })).resolves.toBeUndefined();

    expect(insert).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
