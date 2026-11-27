import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { server } from '@/test/server.ts';
import { AgentsPage } from './AgentsPage.tsx';
import { signInAs } from '../test-fixtures.ts';
import type { ICreatedEnrollmentLink, IEnrollmentLink } from '../types/agent.types.ts';

vi.mock('../constants/enrollment.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../constants/enrollment.ts')>()),
  PENDING_LINKS_REFRESH_MS: 40,
}));

const ok = <T,>(data: T, status = 200) =>
  HttpResponse.json({ statusCode: status, message: 'ok', data }, { status });
const conflict = (message: string) =>
  HttpResponse.json({ statusCode: 409, message, data: null }, { status: 409 });

const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();

const makeLink = (overrides: Partial<IEnrollmentLink> = {}): IEnrollmentLink => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'web-01',
  group: 'default',
  os: 'linux-deb',
  arch: 'x86_64',
  wazuhAgentId: '005',
  status: 'pending',
  createdAt: hours(-1),
  expiresAt: hours(23),
  scriptDownloadedAt: null,
  ...overrides,
});

const NOT_DOWNLOADED = makeLink();
const DOWNLOADED = makeLink({
  id: '22222222-2222-4222-8222-222222222222',
  name: 'db-02',
  group: 'linux',
  os: 'linux-rpm',
  wazuhAgentId: '006',
  scriptDownloadedAt: hours(-0.5),
});
const EXPIRED = makeLink({
  id: '33333333-3333-4333-8333-333333333333',
  name: 'desk-03',
  os: 'windows',
  arch: null,
  wazuhAgentId: '007',
  expiresAt: hours(-1),
});

const newLink = (from: IEnrollmentLink, url: string): ICreatedEnrollmentLink => ({
  id: `${from.id.slice(0, -1)}9`,
  url,
  expiresAt: hours(24),
  name: from.name,
  group: from.group,
  os: from.os,
  arch: from.arch,
  wazuhAgentId: '010',
  agentVersion: '4.14.10',
});

interface IApiLog {
  listCalls: number;
  deleted: string[];
  reissued: string[];
}

const mockApi = (
  links: IEnrollmentLink[],
  replies: { revoke?: () => Response; reissue?: (id: string) => Response } = {},
): IApiLog => {
  const log: IApiLog = { listCalls: 0, deleted: [], reissued: [] };
  let current = [...links];
  server.use(
    http.get('*/api/agents', () => ok([])),
    http.get('*/api/agents/enrollment-links', () => {
      log.listCalls++;
      return ok(current);
    }),
    http.delete('*/api/agents/enrollment-links/:id', ({ params }) => {
      log.deleted.push(String(params.id));
      if (replies.revoke) return replies.revoke();
      current = current.filter((l) => l.id !== params.id);
      return ok(null);
    }),
    http.post('*/api/agents/enrollment-links/:id/reissue', ({ params }) => {
      const id = String(params.id);
      log.reissued.push(id);
      if (replies.reissue) return replies.reissue(id);
      const from = current.find((l) => l.id === id) as IEnrollmentLink;
      return ok(newLink(from, `https://192.168.1.20:8443/e/${'b2'.repeat(32)}`), 201);
    }),
  );
  return log;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/agents']}>
      <AgentsPage />
    </MemoryRouter>,
  );

const pendingTable = () => screen.findByRole('table', { name: 'Pending links' });
const rowFor = async (name: string) => {
  const table = await pendingTable();
  const cell = await within(table).findByText(name);
  return cell.closest('tr') as HTMLElement;
};

describe('Agents page: pending links', () => {
  beforeEach(() => {
    signInAs('admin');
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  });
  afterEach(() => vi.restoreAllMocks());

  it('lists name, group, OS, expiry, script and status for admins', async () => {
    mockApi([NOT_DOWNLOADED, DOWNLOADED, EXPIRED]);
    renderPage();

    const fresh = await rowFor('web-01');
    expect(within(fresh).getByText('default')).toBeInTheDocument();
    expect(within(fresh).getByText('Linux (DEB)')).toBeInTheDocument();
    expect(within(fresh).getByText(/in 23 hours/)).toBeInTheDocument();
    expect(within(fresh).getByText('Not downloaded')).toBeInTheDocument();
    expect(within(fresh).getByText('Not opened yet')).toBeInTheDocument();

    const taken = await rowFor('db-02');
    expect(within(taken).getByText('Downloaded')).toBeInTheDocument();
    expect(within(taken).getByText('Waiting for agent')).toBeInTheDocument();

    const expired = await rowFor('desk-03');
    expect(within(expired).getByText('Windows')).toBeInTheDocument();
    expect(within(expired).getByText('Expired')).toBeInTheDocument();
  });

  it('refreshes the list while the page is visible', async () => {
    const log = mockApi([NOT_DOWNLOADED]);
    renderPage();
    await rowFor('web-01');
    await waitFor(() => expect(log.listCalls).toBeGreaterThanOrEqual(3));
  });

  it('asks before revoking, naming the agent, and does nothing on cancel', async () => {
    const user = userEvent.setup();
    const log = mockApi([NOT_DOWNLOADED, DOWNLOADED]);
    renderPage();

    await user.click(
      within(await rowFor('db-02')).getByRole('button', { name: 'Revoke the link for db-02' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Revoke the link for db-02?');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(log.deleted).toEqual([]);
  });

  it('revokes after confirming, and the link leaves the list', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, 'success');
    const log = mockApi([NOT_DOWNLOADED, DOWNLOADED]);
    renderPage();

    await user.click(
      within(await rowFor('db-02')).getByRole('button', { name: 'Revoke the link for db-02' }),
    );
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Revoke link' }),
    );

    await waitFor(() => expect(log.deleted).toEqual([DOWNLOADED.id]));
    await waitFor(() =>
      expect(
        within(screen.getByRole('table', { name: 'Pending links' })).queryByText('db-02'),
      ).toBeNull(),
    );
    expect(success).toHaveBeenCalledWith('Revoked the link for db-02.');
  });

  it('shows the 409 when the agent connected before the revoke landed', async () => {
    const user = userEvent.setup();
    const error = vi.spyOn(toast, 'error');
    const message =
      'This link is no longer pending (the agent has connected, or the link expired), so it can no longer be revoked';
    mockApi([NOT_DOWNLOADED], { revoke: () => conflict(message) });
    renderPage();

    await user.click(
      within(await rowFor('web-01')).getByRole('button', { name: 'Revoke the link for web-01' }),
    );
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Revoke link' }),
    );
    await waitFor(() => expect(error).toHaveBeenCalledWith(message));
  });

  it.each([
    ['a link whose script was not downloaded', NOT_DOWNLOADED],
    ['a link whose script was downloaded', DOWNLOADED],
  ])('reissues %s and shows the new link once', async (_label, link) => {
    const user = userEvent.setup();
    const log = mockApi([NOT_DOWNLOADED, DOWNLOADED]);
    renderPage();

    await user.click(
      within(await rowFor(link.name)).getByRole('button', {
        name: `Reissue the link for ${link.name}`,
      }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(`New link for ${link.name}`);
    expect(within(dialog).getByLabelText('Enrollment link')).toHaveTextContent(
      `https://192.168.1.20:8443/e/${'b2'.repeat(32)}`,
    );
    expect(within(dialog).getByRole('note')).toHaveTextContent(/shown only once/);
    expect(log.reissued).toEqual([link.id]);

    await user.click(within(dialog).getByRole('button', { name: 'Copy link' }));
    expect(await navigator.clipboard.readText()).toBe(
      `https://192.168.1.20:8443/e/${'b2'.repeat(32)}`,
    );

    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(`https://192.168.1.20:8443/e/${'b2'.repeat(32)}`)).toBeNull();
  });

  it('shows the 409 when reissuing an agent that already connected', async () => {
    const user = userEvent.setup();
    const error = vi.spyOn(toast, 'error');
    const message = 'This agent has already connected, so there is no link to reissue';
    mockApi([NOT_DOWNLOADED], { reissue: () => conflict(message) });
    renderPage();

    await user.click(
      within(await rowFor('web-01')).getByRole('button', { name: 'Reissue the link for web-01' }),
    );
    await waitFor(() => expect(error).toHaveBeenCalledWith(message));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Agents page: analysts', () => {
  it.each(['t1_analyst', 't2_analyst'] as const)(
    'never shows %s the pending links or asks for them',
    async (role) => {
      signInAs(role);
      const log = mockApi([NOT_DOWNLOADED]);
      renderPage();

      expect(await screen.findByText('No agents yet')).toBeInTheDocument();
      expect(screen.queryByText('Pending links')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add agent/i })).not.toBeInTheDocument();
      expect(log.listCalls).toBe(0);
    },
  );
});
