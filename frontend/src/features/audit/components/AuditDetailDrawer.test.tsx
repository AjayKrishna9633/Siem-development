import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditDetailDrawer } from './AuditDetailDrawer.tsx';
import { makeEntry } from '../test-fixtures.ts';

const renderDrawer = (
  entry: ReturnType<typeof makeEntry> | null,
  extra: { loading?: boolean; error?: string | null } = {},
) => {
  const onClose = vi.fn();
  render(
    <AuditDetailDrawer
      entry={entry}
      loading={extra.loading ?? false}
      error={extra.error ?? null}
      onClose={onClose}
    />,
  );
  return { onClose };
};

describe('AuditDetailDrawer', () => {
  it('shows the entry in words and the identifiers a reviewer needs', () => {
    renderDrawer(
      makeEntry({
        action: 'auth.login.failure',
        outcome: 'failure',
        actor: { id: null, username: null, role: null },
        requestId: 'req-abc',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Audit log entry' });

    expect(within(dialog).getByRole('heading', { name: 'Failed sign-in' })).toBeInTheDocument();
    expect(within(dialog).getByText('Failure')).toBeInTheDocument();
    expect(within(dialog).getByText('Anonymous')).toBeInTheDocument();
    expect(within(dialog).getByText('auth.login.failure')).toBeInTheDocument();
    expect(within(dialog).getByText('req-abc')).toBeInTheDocument();
    expect(within(dialog).getByText('203.0.113.7')).toBeInTheDocument();
  });

  it('shows a role change as before → after', () => {
    renderDrawer(
      makeEntry({
        action: 'user.role.change',
        category: 'user',
        metadata: { from: 't1_analyst', to: 'admin' },
      }),
    );
    const changes = screen.getByRole('region', { name: 'Changes' });

    expect(within(changes).getByText('Role')).toBeInTheDocument();
    expect(within(changes).getByText('t1_analyst')).toHaveClass('line-through');
    expect(within(changes).getByText('admin')).not.toHaveClass('line-through');
  });

  it('shows a profile edit as a table of changed fields', () => {
    renderDrawer(
      makeEntry({
        action: 'user.update',
        category: 'user',
        metadata: { before: { username: 'First Admin' }, after: { username: 'Ada Admin' } },
      }),
    );
    const changes = screen.getByRole('region', { name: 'Changes' });
    expect(within(changes).getByText('Username')).toBeInTheDocument();
    expect(within(changes).getByText('First Admin')).toBeInTheDocument();
    expect(within(changes).getByText('Ada Admin')).toBeInTheDocument();
  });

  it('lists the other metadata as details, and omits empty sections', () => {
    renderDrawer(
      makeEntry({
        action: 'auth.login.failure',
        metadata: { email: 'a@x.co', reason: 'wrong_password' },
      }),
    );
    const details = screen.getByRole('region', { name: 'Details' });
    expect(within(details).getByText('wrong_password')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Changes' })).not.toBeInTheDocument();
  });

  it('has no Changes or Details sections for an entry with no metadata', () => {
    renderDrawer(makeEntry({ metadata: {} }));
    expect(screen.queryByRole('region', { name: 'Changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Details' })).not.toBeInTheDocument();
  });

  it('toggles the raw JSON of the whole entry', async () => {
    const entry = makeEntry({ metadata: { reason: 'wrong_password' } });
    renderDrawer(entry);
    expect(screen.queryByLabelText('Raw JSON')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show raw JSON' }));
    const raw = screen.getByLabelText('Raw JSON');
    expect(JSON.parse(raw.textContent ?? '')).toEqual(entry);

    await userEvent.click(screen.getByRole('button', { name: 'Hide raw JSON' }));
    expect(screen.queryByLabelText('Raw JSON')).not.toBeInTheDocument();
  });

  it('closes on Escape, the close button and the backdrop', async () => {
    const { onClose } = renderDrawer(makeEntry());

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    await userEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('moves focus into the drawer and keeps Tab inside it', async () => {
    renderDrawer(makeEntry());
    expect(screen.getByRole('dialog')).toHaveFocus();

    const close = screen.getByRole('button', { name: 'Close' });
    const raw = screen.getByRole('button', { name: 'Show raw JSON' });
    close.focus();
    await userEvent.tab();
    expect(raw).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
  });

  it('shows loading and error states when there is no entry yet', () => {
    const { unmount } = render(
      <AuditDetailDrawer entry={null} loading error={null} onClose={vi.fn()} />,
    );
    expect(screen.getByText('Loading entry…')).toBeInTheDocument();
    unmount();

    render(
      <AuditDetailDrawer entry={null} loading={false} error="Failed to load" onClose={vi.fn()} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load');
  });
});
