import { describe, expect, it, vi } from 'vitest';
import { ListAuditLogsUseCase } from '../../src/application/use-cases/audit/list-audit-logs.usecase.ts';
import { GetAuditLogUseCase } from '../../src/application/use-cases/audit/get-audit-log.usecase.ts';
import { ExportAuditLogsUseCase } from '../../src/application/use-cases/audit/export-audit-logs.usecase.ts';
import { decodeAuditCursor } from '../../src/application/use-cases/audit/audit-cursor.ts';
import { AUDIT_QUERY_LIMITS } from '../../src/domain/constants/audit.ts';
import { AuditCategory } from '../../src/domain/enums/AuditCategory.ts';
import { AuditOutcome } from '../../src/domain/enums/AuditOutcome.ts';
import { UserRole } from '../../src/domain/enums/UserRole.ts';
import type { IAuditLogRepository } from '../../src/application/interfaces/repositories/audit-log.repository.interface.ts';
import type {
  IAuditEvent,
  IAuditService,
} from '../../src/application/interfaces/services/audit.service.interface.ts';
import type { IAuditLogEntry } from '../../src/application/types/use-case/audit.types.ts';

const admin = { userId: 'u1', role: UserRole.ADMIN };
const analyst = { userId: 'u2', role: UserRole.T1_ANALYST };

const entryAt = (n: number): IAuditLogEntry => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  occurredAt: `2026-11-05T10:00:00.${String(1000 - n).padStart(6, '0')}Z`,
  actorId: null,
  actorUsername: null,
  actorRole: null,
  action: 'auth.login.failure',
  category: AuditCategory.AUTH,
  outcome: AuditOutcome.FAILURE,
  targetType: null,
  targetId: null,
  targetLabel: null,
  ipAddress: null,
  userAgent: null,
  requestId: null,
  metadata: {},
});

const repositoryWith = (rows: IAuditLogEntry[], overrides: Partial<IAuditLogRepository> = {}) => {
  const repository: IAuditLogRepository = {
    insert: vi.fn(),
    findPage: vi.fn(async (_filter, _cursor, limit) => rows.slice(0, limit)),
    findById: vi.fn(async (id) => rows.find((r) => r.id === id) ?? null),
    countUpTo: vi.fn(async (_filter, cap) => Math.min(rows.length, cap)),
    ...overrides,
  };
  return repository;
};

describe('ListAuditLogsUseCase', () => {
  it('refuses a role without audit.view before touching the database', async () => {
    const repository = repositoryWith([]);
    await expect(
      new ListAuditLogsUseCase(repository).execute({ actor: analyst, query: {}, limit: 10 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(repository.findPage).not.toHaveBeenCalled();
  });

  it('asks for one row more than the page, and uses it only to know there is a next page', async () => {
    const rows = [1, 2, 3, 4].map(entryAt);
    const repository = repositoryWith(rows);

    const page = await new ListAuditLogsUseCase(repository).execute({
      actor: admin,
      query: {},
      limit: 3,
    });

    expect(vi.mocked(repository.findPage).mock.calls[0]?.[2]).toBe(4);
    expect(page.items).toHaveLength(3);
    expect(decodeAuditCursor(page.nextCursor as string)).toEqual({
      occurredAt: rows[2]?.occurredAt,
      id: rows[2]?.id,
    });
  });

  it('has no next cursor on the last page', async () => {
    const page = await new ListAuditLogsUseCase(repositoryWith([1, 2].map(entryAt))).execute({
      actor: admin,
      query: {},
      limit: 3,
    });
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('has no next cursor when the page is exactly full and nothing follows', async () => {
    const page = await new ListAuditLogsUseCase(repositoryWith([1, 2, 3].map(entryAt))).execute({
      actor: admin,
      query: {},
      limit: 3,
    });
    expect(page.items).toHaveLength(3);
    expect(page.nextCursor).toBeNull();
  });

  it('applies the 90-day cap and rejects a bad cursor', async () => {
    const useCase = new ListAuditLogsUseCase(repositoryWith([]));
    await expect(
      useCase.execute({
        actor: admin,
        query: { from: new Date('2020-01-01T00:00:00Z'), to: new Date('2026-01-01T00:00:00Z') },
        limit: 10,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(
      useCase.execute({ actor: admin, query: {}, limit: 10, cursor: 'nonsense' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

describe('GetAuditLogUseCase', () => {
  it('returns the entry, and a not-found error for an unknown id', async () => {
    const entry = entryAt(1);
    const useCase = new GetAuditLogUseCase(repositoryWith([entry]));

    expect(await useCase.execute({ actor: admin, id: entry.id })).toEqual(entry);
    await expect(useCase.execute({ actor: admin, id: 'missing' })).rejects.toMatchObject({
      code: 'AUDIT_LOG_NOT_FOUND',
    });
  });

  it('refuses a role without audit.view', async () => {
    await expect(
      new GetAuditLogUseCase(repositoryWith([entryAt(1)])).execute({ actor: analyst, id: 'x' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('ExportAuditLogsUseCase', () => {
  const auditSpy = () =>
    ({
      record: vi.fn(async (_event: IAuditEvent) => undefined),
      prepare: vi.fn(),
    }) satisfies IAuditService;

  it('refuses an oversized export before recording or reading anything', async () => {
    const audit = auditSpy();
    const repository = repositoryWith([], {
      countUpTo: vi.fn(async () => AUDIT_QUERY_LIMITS.EXPORT_MAX_ROWS + 1),
    });

    await expect(
      new ExportAuditLogsUseCase(repository, audit).execute({ actor: admin, query: {} }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    expect(audit.record).not.toHaveBeenCalled();
    expect(repository.findPage).not.toHaveBeenCalled();
  });

  it('records the export, with its filters, before any row is read', async () => {
    const audit = auditSpy();
    const repository = repositoryWith([entryAt(1)]);

    const { rows, rowCount } = await new ExportAuditLogsUseCase(repository, audit).execute({
      actor: admin,
      query: { category: AuditCategory.AUTH, q: 'ann' },
    });

    expect(rowCount).toBe(1);
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(repository.findPage).not.toHaveBeenCalled();
    expect(vi.mocked(audit.record).mock.calls[0]?.[0]).toMatchObject({
      action: 'audit.export',
      metadata: { format: 'csv', rowCount: 1, category: 'auth', q: 'ann' },
    });
    expect(vi.mocked(audit.record).mock.calls[0]?.[0].metadata).not.toHaveProperty('actorId');

    for await (const entry of rows) void entry;
    expect(repository.findPage).toHaveBeenCalled();
  });

  it('streams in batches by walking the keyset, and stops on a short batch', async () => {
    const batch = AUDIT_QUERY_LIMITS.EXPORT_BATCH_SIZE;
    const all = Array.from({ length: batch + 5 }, (_, i) => entryAt(i + 1));
    const findPage = vi.fn(async (_filter, cursor: { id: string } | null, limit: number) => {
      const start = cursor ? all.findIndex((e) => e.id === cursor.id) + 1 : 0;
      return all.slice(start, start + limit);
    });
    const repository = repositoryWith(all, { findPage });

    const { rows } = await new ExportAuditLogsUseCase(repository, auditSpy()).execute({
      actor: admin,
      query: {},
    });
    const seen: string[] = [];
    for await (const entry of rows) seen.push(entry.id);

    expect(seen).toEqual(all.map((e) => e.id));
    expect(findPage).toHaveBeenCalledTimes(2);
  });

  it('refuses a role without audit.view', async () => {
    await expect(
      new ExportAuditLogsUseCase(repositoryWith([]), auditSpy()).execute({
        actor: analyst,
        query: {},
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
