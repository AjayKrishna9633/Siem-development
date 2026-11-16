import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RANGE,
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
  isoToLocalInput,
  localInputToIso,
  rangeError,
  toQuery,
} from './filters.ts';
import type { IAuditFilters } from '../types/audit.types.ts';

const now = new Date('2026-11-14T12:00:00.000Z');
const ACTOR = '0b2f4a52-1111-4222-8333-444455556666';
const parse = (query: string) => filtersFromParams(new URLSearchParams(query));
const days = (n: number) => n * 86_400_000;

describe('filtersFromParams', () => {
  it('defaults to the last 7 days with nothing else set', () => {
    expect(parse('')).toEqual({ range: '7d' });
  });

  it('reads every filter', () => {
    expect(parse(`range=30d&category=auth&outcome=failure&actor=${ACTOR}&q=%20ann%20`)).toEqual({
      range: '30d',
      category: 'auth',
      outcome: 'failure',
      actorId: ACTOR,
      q: 'ann',
    });
  });

  it('reads a custom range as normalised ISO dates', () => {
    const filters = parse('range=custom&from=2026-11-01T10:00:00Z&to=2026-11-02T10:00:00Z');
    expect(filters).toEqual({
      range: 'custom',
      from: '2026-11-01T10:00:00.000Z',
      to: '2026-11-02T10:00:00.000Z',
    });
  });

  it('ignores dates unless the range is custom', () => {
    expect(parse('range=7d&from=2026-11-01T10:00:00Z')).toEqual({ range: '7d' });
  });

  it('drops anything it does not recognise instead of passing it to the API', () => {
    expect(
      parse('range=forever&category=bogus&outcome=maybe&actor=not-a-uuid&from=yesterday'),
    ).toEqual({ range: DEFAULT_RANGE });
    expect(parse('range=custom&from=yesterday&to=')).toEqual({
      range: 'custom',
      from: undefined,
      to: undefined,
    });
  });

  it('caps the search text at 100 characters', () => {
    expect(parse(`q=${'x'.repeat(300)}`).q).toHaveLength(100);
  });
});

describe('filtersToParams', () => {
  it('leaves defaults out, so "everything" has no query string', () => {
    expect(filtersToParams({ range: '7d' }).toString()).toBe('');
  });

  it('round-trips a full set of filters', () => {
    const filters: IAuditFilters = {
      range: 'custom',
      from: '2026-11-01T10:00:00.000Z',
      to: '2026-11-02T10:00:00.000Z',
      category: 'user',
      outcome: 'denied',
      actorId: ACTOR,
      q: 'role change',
    };
    expect(parse(filtersToParams(filters).toString())).toEqual(filters);
  });

  it('does not write custom dates for a preset range', () => {
    const params = filtersToParams({ range: '24h', from: '2026-11-01T10:00:00.000Z' });
    expect(params.has('from')).toBe(false);
    expect(params.get('range')).toBe('24h');
  });
});

describe('toQuery', () => {
  it.each([
    ['24h', 1],
    ['7d', 7],
    ['30d', 30],
  ] as const)('turns %s into concrete dates ending now', (range, spanDays) => {
    const query = toQuery({ range }, now);
    expect(query.to).toBe(now.toISOString());
    expect(query.from).toBe(new Date(now.getTime() - days(spanDays)).toISOString());
  });

  it('uses custom dates exactly as chosen', () => {
    const query = toQuery(
      { range: 'custom', from: '2026-11-01T00:00:00.000Z', to: '2026-11-03T00:00:00.000Z' },
      now,
    );
    expect(query).toMatchObject({
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-11-03T00:00:00.000Z',
    });
  });

  it('passes the other filters through', () => {
    expect(
      toQuery({ range: '7d', category: 'auth', outcome: 'failure', actorId: ACTOR, q: 'x' }, now),
    ).toMatchObject({ category: 'auth', outcome: 'failure', actorId: ACTOR, q: 'x' });
  });
});

describe('rangeError', () => {
  const custom = (from?: string, to?: string): IAuditFilters => ({ range: 'custom', from, to });

  it('has nothing to say about a preset', () => {
    expect(rangeError({ range: '30d' }, now)).toBeNull();
  });

  it('accepts exactly 90 days', () => {
    const from = new Date(now.getTime() - days(90)).toISOString();
    expect(rangeError(custom(from, now.toISOString()), now)).toBeNull();
  });

  it('refuses more than 90 days', () => {
    const from = new Date(now.getTime() - days(91)).toISOString();
    expect(rangeError(custom(from, now.toISOString()), now)).toMatch(/90 days or less/);
  });

  it('refuses a "from" alone that is older than 90 days, as the server does', () => {
    const from = new Date(now.getTime() - days(120)).toISOString();
    expect(rangeError(custom(from), now)).toMatch(/90 days or less/);
  });

  it('refuses an end before the start, or an empty range', () => {
    expect(rangeError(custom('2026-11-02T00:00:00.000Z', '2026-11-01T00:00:00.000Z'), now)).toMatch(
      /before its end/,
    );
    expect(rangeError(custom('2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'), now)).toMatch(
      /before its end/,
    );
  });

  it('accepts a custom range with no dates yet', () => {
    expect(rangeError(custom(), now)).toBeNull();
  });
});

describe('datetime-local conversion', () => {
  it('round-trips local wall-clock time through ISO', () => {
    const iso = localInputToIso('2026-11-14T09:30');
    expect(iso).toBeDefined();
    expect(isoToLocalInput(iso)).toBe('2026-11-14T09:30');
  });

  it('treats empty and invalid input as no date', () => {
    expect(localInputToIso('')).toBeUndefined();
    expect(localInputToIso('not a date')).toBeUndefined();
    expect(isoToLocalInput(undefined)).toBe('');
    expect(isoToLocalInput('garbage')).toBe('');
  });
});

describe('hasActiveFilters', () => {
  it('is false for the defaults and true for anything else', () => {
    expect(hasActiveFilters({ range: '7d' })).toBe(false);
    expect(hasActiveFilters({ range: '24h' })).toBe(true);
    expect(hasActiveFilters({ range: '7d', q: 'x' })).toBe(true);
    expect(hasActiveFilters({ range: '7d', outcome: 'failure' })).toBe(true);
  });
});
