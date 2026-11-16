import { describe, expect, it } from 'vitest';
import {
  decodeAuditCursor,
  encodeAuditCursor,
} from '../../src/application/use-cases/audit/audit-cursor.ts';

const cursor = {
  occurredAt: '2026-11-05T10:00:00.123456Z',
  id: '0b2f4a52-1111-4222-8333-444455556666',
};
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('audit cursor', () => {
  it('round-trips, microseconds included', () => {
    expect(decodeAuditCursor(encodeAuditCursor(cursor))).toEqual(cursor);
  });

  it('is URL-safe', () => {
    expect(encodeAuditCursor(cursor)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['not base64 json', 'garbage!!'],
    ['json that is not an object', encode('hello')],
    ['null', encode(null)],
    ['a missing id', encode({ t: cursor.occurredAt })],
    ['a timestamp with milliseconds only', encode({ t: '2026-11-05T10:00:00.123Z', i: cursor.id })],
    ['a timestamp that is just text', encode({ t: 'yesterday', i: cursor.id })],
    ['an id that is not a uuid', encode({ t: cursor.occurredAt, i: '1; DROP TABLE users' })],
    ['a non-string timestamp', encode({ t: 123, i: cursor.id })],
  ])('rejects %s as a validation error', (_name, raw) => {
    expect(() => decodeAuditCursor(raw)).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    );
  });
});
