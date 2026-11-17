import { describe, expect, it } from 'vitest';
import {
  AUDIT_CSV_HEADER,
  auditCsvRow,
  csvCell,
  csvLine,
} from '../../src/presentation/http/audit-csv.ts';
import type { IAuditLogEntry } from '../../src/application/types/use-case/audit.types.ts';
import { AuditCategory } from '../../src/domain/enums/AuditCategory.ts';
import { AuditOutcome } from '../../src/domain/enums/AuditOutcome.ts';

const entry = (overrides: Partial<IAuditLogEntry> = {}): IAuditLogEntry => ({
  id: 'id-1',
  occurredAt: '2026-11-05T10:00:00.123456Z',
  actorId: 'u1',
  actorUsername: 'Ann',
  actorRole: 'admin',
  action: 'auth.login.success',
  category: AuditCategory.AUTH,
  outcome: AuditOutcome.SUCCESS,
  targetType: 'user',
  targetId: 'u1',
  targetLabel: 'a@x.co',
  ipAddress: '203.0.113.7',
  userAgent: 'vitest',
  requestId: 'req-1',
  metadata: {},
  ...overrides,
});

describe('csvCell', () => {
  it('leaves plain text alone and writes null as empty', () => {
    expect(csvCell('hello world')).toBe('hello world');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes cells with commas, quotes or line breaks, doubling inner quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('line1\r\nline2')).toBe('"line1\r\nline2"');
  });

  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tcmd', '\rcmd'])(
    'defuses a spreadsheet formula: %j',
    (value) => {
      expect(csvCell(value).replace(/^"/, '')).toMatch(/^'/);
    },
  );

  it('defuses a formula that also needs quoting, with the guard inside the quotes', () => {
    expect(csvCell('=HYPERLINK("http://evil","click")')).toBe(
      `"'=HYPERLINK(""http://evil"",""click"")"`,
    );
  });

  it('does not touch a value that merely contains a trigger character', () => {
    expect(csvCell('a=b')).toBe('a=b');
    expect(csvCell('2026-11-05T10:00:00Z')).toBe('2026-11-05T10:00:00Z');
  });
});

describe('auditCsvRow', () => {
  it('has one cell for every header column, in order', () => {
    const cells = auditCsvRow(entry()).trimEnd().split(',');
    expect(cells).toHaveLength(AUDIT_CSV_HEADER.length);
    expect(cells[0]).toBe('2026-11-05T10:00:00.123456Z');
    expect(cells[4]).toBe('auth.login.success');
    expect(cells.at(-1)).toBe('id-1');
  });

  it('ends each line with CRLF', () => {
    expect(csvLine(['a', 'b'])).toBe('a,b\r\n');
    expect(auditCsvRow(entry()).endsWith('\r\n')).toBe(true);
  });

  it('writes metadata as quoted JSON', () => {
    const row = auditCsvRow(entry({ metadata: { from: 't1_analyst', to: 'admin' } }));
    expect(row).toContain('"{""from"":""t1_analyst"",""to"":""admin""}"');
  });

  it('defuses attacker-chosen text such as a username typed into a failed login', () => {
    const row = auditCsvRow(entry({ actorUsername: '=cmd|"/c calc"!A1', userAgent: '@evil' }));
    expect(row).toContain(`"'=cmd|""/c calc""!A1"`);
    expect(row).toContain(`'@evil`);
  });
});
