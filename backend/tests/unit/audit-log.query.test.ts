import { describe, expect, it } from 'vitest';
import { buildAuditWhere } from '../../src/infrastructure/database/queries/audit-log.query.ts';
import { AuditCategory } from '../../src/domain/enums/AuditCategory.ts';
import { AuditOutcome } from '../../src/domain/enums/AuditOutcome.ts';

const from = new Date('2026-11-01T00:00:00Z');
const to = new Date('2026-11-08T00:00:00Z');

describe('buildAuditWhere', () => {
  it('always bounds by the date range, and nothing else when no filter is set', () => {
    const where = buildAuditWhere({ from, to });

    expect(where.sql).toBe('WHERE occurred_at >= $1 AND occurred_at <= $2');
    expect(where.params).toEqual([from, to]);
  });

  it('adds one equality clause per exact filter, numbering the placeholders in order', () => {
    const where = buildAuditWhere({
      from,
      to,
      actorId: '0b2f4a52-1111-4222-8333-444455556666',
      category: AuditCategory.AUTH,
      action: 'auth.login.failure',
      outcome: AuditOutcome.FAILURE,
    });

    expect(where.sql).toBe(
      'WHERE occurred_at >= $1 AND occurred_at <= $2 AND actor_id = $3 AND category = $4 ' +
        'AND action = $5 AND outcome = $6',
    );
    expect(where.params).toEqual([
      from,
      to,
      '0b2f4a52-1111-4222-8333-444455556666',
      'auth',
      'auth.login.failure',
      'failure',
    ]);
  });

  it('searches actor name, target label and action with one shared pattern', () => {
    const where = buildAuditWhere({ from, to, q: 'ann' });

    expect(where.sql).toContain(
      '(actor_username ILIKE $3 OR target_label ILIKE $3 OR action ILIKE $3)',
    );
    expect(where.params[2]).toBe('%ann%');
  });

  it('escapes LIKE wildcards so a search matches them literally', () => {
    const where = buildAuditWhere({ from, to, q: '100%_off\\' });
    expect(where.params[2]).toBe('%100\\%\\_off\\\\%');
  });

  it('continues after a cursor using the exact timestamp text, cast in SQL', () => {
    const where = buildAuditWhere(
      { from, to },
      { occurredAt: '2026-11-05T10:00:00.123456Z', id: '0b2f4a52-1111-4222-8333-444455556666' },
    );

    expect(where.sql).toContain('(occurred_at, id) < ($3::timestamptz, $4::uuid)');
    expect(where.params.slice(2)).toEqual([
      '2026-11-05T10:00:00.123456Z',
      '0b2f4a52-1111-4222-8333-444455556666',
    ]);
  });

  it('keeps hostile input out of the SQL text', () => {
    const hostile = `'; DROP TABLE audit_logs; --`;
    const where = buildAuditWhere({ from, to, action: hostile, q: hostile });

    expect(where.sql).not.toContain('DROP');
    expect(where.sql).not.toContain(hostile);
    expect(where.params).toContain(hostile);
  });
});
