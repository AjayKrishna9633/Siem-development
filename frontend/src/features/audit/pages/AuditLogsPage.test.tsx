import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { http, HttpResponse } from 'msw';
import { Toaster } from 'sonner';
import { server } from '@/test/server.ts';
import { AuditLogsPage } from './AuditLogsPage.tsx';
import { ADMIN, makeEntry } from '../test-fixtures.ts';
import type { IAuditLog } from '../types/audit.types.ts';

const ok = <T,>(data: T) => HttpResponse.json({ statusCode: 200, message: 'ok', data });

const Location: React.FC = () => <output data-testid="url">{useLocation().search}</output>;

const renderPage = (url = '/audit') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/audit" element={<AuditLogsPage />} />
      </Routes>
      <Location />
      <Toaster theme="dark" />
    </MemoryRouter>,
  );

interface IRequestLog {
  params: URLSearchParams[];
}

// Registers the three endpoints the page talks to and records each audit list request.
const mockApi = (
  pages: (params: URLSearchParams) => { items: IAuditLog[]; nextCursor: string | null },
): IRequestLog => {
  const log: IRequestLog = { params: [] };
  server.use(
    http.get('*/api/audit-logs/export', () => new HttpResponse('csv', { status: 200 })),
    http.get('*/api/audit-logs', ({ request }) => {
      const params = new URL(request.url).searchParams;
      log.params.push(params);
      return ok(pages(params));
    }),
    http.get('*/api/users/invites', () => ok([])),
    http.get('*/api/users', () =>
      ok({
        items: [
          { id: ADMIN.id, email: 'admin@example.com', username: 'First Admin', role: 'admin' },
          {
            id: '11111111-1111-4111-8111-111111111111',
            email: 'tier1@example.com',
            username: null,
            role: 't1_analyst',
          },
        ],
        page: 1,
        pageSize: 100,
        total: 2,
        counts: { all: 2, invited: 0, disabled: 0 },
      }),
    ),
  );
  return log;
};

const urlText = () => screen.getByTestId('url').textContent ?? '';

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('loads the newest 50 entries for the last 7 days', async () => {
    const log = mockApi(() => ({
      items: [makeEntry({ action: 'auth.login.failure', outcome: 'failure' })],
      nextCursor: null,
    }));
    renderPage();

    expect(await screen.findByText('Failed sign-in')).toBeInTheDocument();
    const params = log.params[0]!;
    expect(params.get('limit')).toBe('50');
    expect(params.has('cursor')).toBe(false);
    const span = new Date(params.get('to')!).getTime() - new Date(params.get('from')!).getTime();
    expect(span).toBe(7 * 86_400_000);
  });

  it('shows the empty state, with a hint that filters may be the reason once any are set', async () => {
    mockApi(() => ({ items: [], nextCursor: null }));
    renderPage();
    expect(await screen.findByText('No audit entries in this period.')).toBeInTheDocument();
  });

  it('says no entries match when filters are set, and Clear filters resets them', async () => {
    mockApi(() => ({ items: [], nextCursor: null }));
    renderPage('/audit?outcome=denied&q=zzz');

    expect(await screen.findByText('No audit entries match these filters.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => expect(urlText()).toBe(''));
    expect(await screen.findByText('No audit entries in this period.')).toBeInTheDocument();
  });

  it('puts filters in the URL and sends them to the API', async () => {
    const log = mockApi(() => ({ items: [makeEntry()], nextCursor: null }));
    renderPage();
    await screen.findByText('Signed in');

    const [category, outcome] = screen.getAllByRole('combobox');
    await userEvent.selectOptions(category!, 'auth');
    await userEvent.selectOptions(outcome!, 'failure');

    await waitFor(() => expect(urlText()).toContain('outcome=failure'));
    expect(urlText()).toContain('category=auth');
    await waitFor(() => {
      const last = log.params.at(-1)!;
      expect(last.get('category')).toBe('auth');
      expect(last.get('outcome')).toBe('failure');
    });
  });

  it('applies filters that arrive in the URL, and ignores ones it does not recognise', async () => {
    const log = mockApi(() => ({ items: [], nextCursor: null }));
    renderPage('/audit?range=24h&category=bogus&outcome=denied');
    await screen.findByText('No audit entries match these filters.');

    const params = log.params[0]!;
    expect(params.get('outcome')).toBe('denied');
    expect(params.has('category')).toBe(false);
    const span = new Date(params.get('to')!).getTime() - new Date(params.get('from')!).getTime();
    expect(span).toBe(86_400_000);
  });

  it('waits for a pause in typing before searching', async () => {
    const log = mockApi(() => ({ items: [makeEntry()], nextCursor: null }));
    renderPage();
    await screen.findByText('Signed in');
    const before = log.params.length;

    await userEvent.type(screen.getByLabelText('Search the audit log'), 'admin');
    expect(log.params.length).toBe(before);

    await waitFor(() => expect(log.params.at(-1)!.get('q')).toBe('admin'), { timeout: 2000 });
    expect(urlText()).toContain('q=admin');
    expect(log.params.length).toBe(before + 1);
  });

  it('offers everyone as an actor, and filters when a name in a row is clicked', async () => {
    const log = mockApi(() => ({ items: [makeEntry({ actor: ADMIN })], nextCursor: null }));
    renderPage();
    await screen.findByText('Signed in');

    const actorSelect = screen.getAllByRole('combobox')[2]!;
    await waitFor(() => expect(within(actorSelect).getByText('First Admin')).toBeInTheDocument());
    // A user with no username is offered by email.
    expect(within(actorSelect).getByText('tier1@example.com')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'First Admin' }));

    await waitFor(() => expect(urlText()).toContain(`actor=${ADMIN.id}`));
    await waitFor(() => expect(log.params.at(-1)!.get('actorId')).toBe(ADMIN.id));
  });

  it('pages with Older and Newer using the cursor the server returned', async () => {
    const newest = makeEntry({ action: 'auth.login.success' });
    const older = makeEntry({ action: 'auth.logout' });
    const log = mockApi((params) =>
      params.get('cursor') === 'cursor-1'
        ? { items: [older], nextCursor: null }
        : { items: [newest], nextCursor: 'cursor-1' },
    );
    renderPage();

    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText('Page 1 · 1 entry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Newer' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Older' }));
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(log.params.at(-1)!.get('cursor')).toBe('cursor-1');
    expect(screen.getByText('Page 2 · 1 entry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Older' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Newer' }));
    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(log.params.at(-1)!.has('cursor')).toBe(false);
  });

  it('starts again from the newest page when a filter changes', async () => {
    const log = mockApi((params) =>
      params.get('cursor')
        ? { items: [makeEntry({ action: 'auth.logout' })], nextCursor: null }
        : { items: [makeEntry()], nextCursor: 'cursor-1' },
    );
    renderPage();
    await screen.findByText('Signed in');
    await userEvent.click(screen.getByRole('button', { name: 'Older' }));
    await screen.findByText('Page 2 · 1 entry');

    await userEvent.selectOptions(screen.getAllByRole('combobox')[1]!, 'failure');

    await screen.findByText('Page 1 · 1 entry');
    expect(log.params.at(-1)!.has('cursor')).toBe(false);
    expect(log.params.at(-1)!.get('outcome')).toBe('failure');
  });

  it('shows the failure with a retry when the request fails', async () => {
    let fail = true;
    server.use(
      http.get('*/api/users/invites', () => ok([])),
      http.get('*/api/users', () =>
        ok({
          items: [],
          page: 1,
          pageSize: 100,
          total: 0,
          counts: { all: 0, invited: 0, disabled: 0 },
        }),
      ),
      http.get('*/api/audit-logs', () =>
        fail
          ? HttpResponse.json({ message: 'Database unavailable' }, { status: 500 })
          : ok({ items: [makeEntry()], nextCursor: null }),
      ),
    );
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Database unavailable');
    // The error is orange, never the red kept for Critical alerts.
    expect(within(alert).getByText('Database unavailable').className).toMatch(/text-high/);
    expect(alert.innerHTML).not.toMatch(/critical/);

    fail = false;
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Signed in')).toBeInTheDocument();
  });

  it('refuses a range over 90 days without calling the API, and disables export', async () => {
    const log = mockApi(() => ({ items: [], nextCursor: null }));
    renderPage('/audit?range=custom&from=2026-01-01T00:00:00Z&to=2026-06-01T00:00:00Z');

    expect(await screen.findByText('Choose a range of 90 days or less.')).toBeInTheDocument();
    expect(screen.getByText('Choose a valid date range to see entries.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    expect(log.params).toHaveLength(0);
  });

  it('prefills a custom range from the preset that was showing', async () => {
    mockApi(() => ({ items: [makeEntry()], nextCursor: null }));
    renderPage('/audit?range=24h');
    await screen.findByText('Signed in');

    await userEvent.click(screen.getByRole('button', { name: 'custom' }));

    await waitFor(() => expect(urlText()).toContain('range=custom'));
    expect(urlText()).toContain('from=');
    expect(urlText()).toContain('to=');
    expect((screen.getByLabelText('From') as HTMLInputElement).value).not.toBe('');
  });

  describe('detail drawer', () => {
    it('opens on a row, records the entry in the URL, and closes with Escape', async () => {
      const entry = makeEntry({
        action: 'user.role.change',
        category: 'user',
        metadata: { from: 't1_analyst', to: 'admin' },
      });
      mockApi(() => ({ items: [entry], nextCursor: null }));
      renderPage();

      await userEvent.click(await screen.findByRole('row', { name: /Changed a role/ }));

      const dialog = await screen.findByRole('dialog', { name: 'Audit log entry' });
      expect(within(dialog).getByRole('heading', { name: 'Changed a role' })).toBeInTheDocument();
      expect(urlText()).toContain(`log=${entry.id}`);

      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(urlText()).not.toContain('log=');
    });

    it('keeps the filters when it opens and closes', async () => {
      mockApi(() => ({ items: [makeEntry({ outcome: 'failure' })], nextCursor: null }));
      renderPage('/audit?outcome=failure');

      await userEvent.click(await screen.findByRole('row', { name: /Signed in, failure/ }));
      await screen.findByRole('dialog');
      expect(urlText()).toContain('outcome=failure');

      await userEvent.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(urlText()).toBe('?outcome=failure');
    });

    it('fetches an entry by id when a link points at one that is not on the page', async () => {
      const linked = makeEntry({ action: 'auth.account.locked', outcome: 'failure' });
      mockApi(() => ({ items: [makeEntry()], nextCursor: null }));
      server.use(http.get(`*/api/audit-logs/${linked.id}`, () => ok(linked)));
      renderPage(`/audit?log=${linked.id}`);

      const dialog = await screen.findByRole('dialog', { name: 'Audit log entry' });
      expect(
        await within(dialog).findByRole('heading', { name: 'Account locked' }),
      ).toBeInTheDocument();
    });

    it('does not open for a log id that is not a UUID', async () => {
      mockApi(() => ({ items: [makeEntry()], nextCursor: null }));
      renderPage('/audit?log=not-a-uuid');
      await screen.findByText('Signed in');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('export', () => {
    it('downloads a CSV for the current filters, named by the server', async () => {
      mockApi(() => ({ items: [makeEntry()], nextCursor: null }));
      let query: URLSearchParams | undefined;
      server.use(
        http.get('*/api/audit-logs/export', ({ request }) => {
          query = new URL(request.url).searchParams;
          return new HttpResponse('a,b\r\n', {
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': 'attachment; filename="audit-logs-20261114-1200.csv"',
            },
          });
        }),
      );
      renderPage('/audit?outcome=failure&range=30d');
      await screen.findByText('Signed in');

      await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

      expect(await screen.findByText('Exported audit-logs-20261114-1200.csv')).toBeInTheDocument();
      expect(query?.get('format')).toBe('csv');
      expect(query?.get('outcome')).toBe('failure');
      expect(query?.has('limit')).toBe(false);
      expect(query?.has('cursor')).toBe(false);
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });

    it("shows the server's reason when an export is refused", async () => {
      mockApi(() => ({ items: [makeEntry()], nextCursor: null }));
      server.use(
        http.get('*/api/audit-logs/export', () =>
          HttpResponse.json(
            {
              message:
                'This export is too large. Narrow the date range or add filters and try again',
            },
            { status: 400 },
          ),
        ),
      );
      renderPage();
      await screen.findByText('Signed in');

      await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

      expect(await screen.findByText(/This export is too large/)).toBeInTheDocument();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
    });
  });
});
