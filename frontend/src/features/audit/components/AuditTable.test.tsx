import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditTable } from './AuditTable.tsx';
import { OutcomeBadge } from './OutcomeBadge.tsx';
import { ADMIN, makeEntry } from '../test-fixtures.ts';

const renderTable = (
  entries = [makeEntry()],
  props: Partial<React.ComponentProps<typeof AuditTable>> = {},
) => {
  const onSelect = vi.fn();
  const onFilterActor = vi.fn();
  render(
    <AuditTable
      entries={entries}
      loading={false}
      refreshing={false}
      emptyText="Nothing here."
      onSelect={onSelect}
      onFilterActor={onFilterActor}
      {...props}
    />,
  );
  return { onSelect, onFilterActor };
};

describe('AuditTable', () => {
  it('shows the six columns', () => {
    renderTable();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Time', 'Actor', 'Action', 'Target', 'Outcome', 'IP address']);
  });

  it('shows the time as relative text, with the exact time on hover', () => {
    renderTable();
    const time = screen.getByText(/ago$/);
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveTextContent('5 minutes ago');
    // The stored timestamp, microseconds included, is part of the tooltip.
    expect(time.getAttribute('title')).toMatch(/\.\d{3}456Z$/);
  });

  it('shows the action in words, with the stored code on hover', () => {
    renderTable([makeEntry({ action: 'auth.login.failure', outcome: 'failure' })]);
    const cell = screen.getByText('Failed sign-in');
    expect(cell).toHaveAttribute('title', 'auth.login.failure');
  });

  it('shows the target label with its type, or a dash when there is none', () => {
    renderTable([
      makeEntry(),
      makeEntry({ target: { type: null, id: null, label: null }, ipAddress: null }),
    ]);
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('names actors who are not signed-in people', () => {
    renderTable([
      makeEntry({ actor: { id: null, username: 'system', role: null } }),
      makeEntry({ actor: { id: null, username: null, role: null } }),
    ]);
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
    // Neither can be filtered on: there is no id to filter by.
    expect(screen.queryByRole('button', { name: 'System' })).not.toBeInTheDocument();
  });

  it('opens an entry on click and on Enter', async () => {
    const entry = makeEntry();
    const { onSelect } = renderTable([entry]);
    const row = screen.getByRole('row', { name: /Signed in, success/ });

    await userEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(entry);

    row.focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('filters by an actor when their name is clicked, without opening the row', async () => {
    const entry = makeEntry({ actor: ADMIN });
    const { onSelect, onFilterActor } = renderTable([entry]);

    await userEvent.click(screen.getByRole('button', { name: 'First Admin' }));

    expect(onFilterActor).toHaveBeenCalledWith(entry);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows a loading row on first load and the empty text when there is nothing', () => {
    const { unmount } = render(
      <AuditTable
        entries={[]}
        loading
        refreshing={false}
        emptyText="Nothing here."
        onSelect={vi.fn()}
        onFilterActor={vi.fn()}
      />,
    );
    expect(screen.getByText('Loading audit log…')).toBeInTheDocument();
    unmount();

    renderTable([]);
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  it('keeps old rows on screen, dimmed, while the next load runs', () => {
    renderTable([makeEntry()], { refreshing: true });
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Signed in').closest('tbody')).toHaveClass('opacity-60');
  });
});

describe('OutcomeBadge', () => {
  const badge = (outcome: 'success' | 'failure' | 'denied') => {
    const { unmount } = render(<OutcomeBadge outcome={outcome} />);
    const element = screen.getByText(outcome[0]!.toUpperCase() + outcome.slice(1));
    return { element, unmount };
  };

  it('keeps a success neutral', () => {
    const { element } = badge('success');
    expect(element.className).toMatch(/text-muted/);
    expect(element.className).not.toMatch(/text-high|text-critical/);
  });

  it.each(['failure', 'denied'] as const)('marks a %s in the High colour, never red', (outcome) => {
    const { element } = badge(outcome);
    expect(element.className).toMatch(/text-high/);
    expect(element.className).not.toMatch(/critical/);
  });

  it('says the outcome in words, not only in colour', () => {
    render(
      <>
        <OutcomeBadge outcome="failure" />
        <OutcomeBadge outcome="denied" />
      </>,
    );
    const texts = within(document.body).getAllByText(/Failure|Denied/);
    expect(texts).toHaveLength(2);
  });
});
