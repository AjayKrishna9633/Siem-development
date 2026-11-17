import { describe, expect, it } from 'vitest';
import { resolveAuditRange } from '../../src/application/use-cases/audit/audit-range.ts';

const now = new Date('2026-11-14T12:00:00Z');
const daysBefore = (date: Date, days: number) => new Date(date.getTime() - days * 86_400_000);

describe('resolveAuditRange', () => {
  it('defaults to the last 7 days up to now', () => {
    expect(resolveAuditRange({}, now)).toEqual({ from: daysBefore(now, 7), to: now });
  });

  it('runs from `from` to now when only `from` is given', () => {
    const from = daysBefore(now, 2);
    expect(resolveAuditRange({ from }, now)).toEqual({ from, to: now });
  });

  it('runs 7 days up to `to` when only `to` is given', () => {
    const to = new Date('2026-10-20T00:00:00Z');
    expect(resolveAuditRange({ to }, now)).toEqual({ from: daysBefore(to, 7), to });
  });

  it('accepts exactly 90 days', () => {
    const from = daysBefore(now, 90);
    expect(resolveAuditRange({ from, to: now }, now)).toEqual({ from, to: now });
  });

  it('refuses a range even one second over 90 days', () => {
    const from = new Date(daysBefore(now, 90).getTime() - 1000);
    expect(() => resolveAuditRange({ from, to: now }, now)).toThrowError(/at most 90 days/);
  });

  it('refuses `from` alone when that makes the range longer than 90 days, rather than clipping it', () => {
    expect(() => resolveAuditRange({ from: daysBefore(now, 120) }, now)).toThrowError(
      /at most 90 days/,
    );
  });

  it('refuses a range that ends before it starts, or has no length', () => {
    expect(() => resolveAuditRange({ from: now, to: daysBefore(now, 1) }, now)).toThrowError(
      /before its end/,
    );
    expect(() => resolveAuditRange({ from: now, to: now }, now)).toThrowError(/before its end/);
  });

  it('reports both problems as a validation error', () => {
    expect(() => resolveAuditRange({ from: daysBefore(now, 200) }, now)).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    );
  });
});
