import { describe, expect, it } from 'vitest';
import { describeMetadata, formatValue } from './describeMetadata.ts';

describe('describeMetadata', () => {
  it('turns a before/after pair into one row per field, covering fields on either side', () => {
    const view = describeMetadata('user.update', {
      before: { username: 'First Admin', phone: '1' },
      after: { username: 'Ada Admin', title: 'Lead' },
    });

    expect(view.changes).toEqual([
      { field: 'Username', before: 'First Admin', after: 'Ada Admin' },
      { field: 'Phone', before: '1', after: undefined },
      { field: 'Title', before: undefined, after: 'Lead' },
    ]);
    expect(view.details).toEqual([]);
  });

  it('turns { from, to } into a single change named after the action', () => {
    const view = describeMetadata('user.role.change', { from: 't1_analyst', to: 'admin' });
    expect(view.changes).toEqual([{ field: 'Role', before: 't1_analyst', after: 'admin' }]);
  });

  it('falls back to "Value" for a from/to pair on an action it has no name for', () => {
    expect(describeMetadata('rule.edit', { from: 1, to: 2 }).changes[0]?.field).toBe('Value');
  });

  it('keeps everything that is not part of a change as details', () => {
    const view = describeMetadata('auth.login.failure', {
      email: 'a@x.co',
      reason: 'wrong_password',
    });
    expect(view.changes).toEqual([]);
    expect(view.details).toEqual([
      { key: 'email', value: 'a@x.co' },
      { key: 'reason', value: 'wrong_password' },
    ]);
  });

  it('shows leftover keys alongside a change', () => {
    const view = describeMetadata('user.role.change', { from: 'a', to: 'b', note: 'x' });
    expect(view.changes).toHaveLength(1);
    expect(view.details).toEqual([{ key: 'note', value: 'x' }]);
  });

  it('does not treat a lone before, or a before that is not an object, as a diff', () => {
    expect(describeMetadata('x', { before: { a: 1 } }).changes).toEqual([]);
    expect(describeMetadata('x', { before: 'a', after: 'b' }).changes).toEqual([]);
    expect(describeMetadata('x', { before: 'a', after: 'b' }).details).toHaveLength(2);
  });

  it('handles empty metadata', () => {
    expect(describeMetadata('auth.logout', {})).toEqual({ changes: [], details: [] });
  });
});

describe('formatValue', () => {
  it.each([
    [null, '—'],
    [undefined, '—'],
    ['', '(empty)'],
    ['admin', 'admin'],
    [4, '4'],
    [true, 'true'],
    [{ a: 1 }, '{"a":1}'],
    [['x', 'y'], '["x","y"]'],
  ])('formats %j as %j', (value, text) => {
    expect(formatValue(value)).toBe(text);
  });
});
