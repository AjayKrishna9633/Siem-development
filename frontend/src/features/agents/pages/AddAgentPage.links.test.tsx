import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server.ts';
import { AddAgentPage } from './AddAgentPage.tsx';
import { signInAs } from '../test-fixtures.ts';
import type { ICreatedEnrollmentLink } from '../types/agent.types.ts';

const ok = <T,>(data: T, status = 200) =>
  HttpResponse.json({ statusCode: status, message: 'ok', data }, { status });

const LINK_URL = `https://192.168.1.20:8443/e/${'a1'.repeat(32)}`;
const inADay = () => new Date(Date.now() + 24 * 3_600_000).toISOString();

const makeLink = (overrides: Partial<ICreatedEnrollmentLink> = {}): ICreatedEnrollmentLink => ({
  id: '11111111-1111-4111-8111-111111111111',
  url: LINK_URL,
  expiresAt: inADay(),
  name: 'web-01',
  group: 'default',
  os: 'linux-deb',
  arch: 'arm64',
  wazuhAgentId: '005',
  agentVersion: '4.14.10',
  ...overrides,
});

// A tiny Agents page with a way back, to prove the link isn't shown again.
const AgentsStub = () => {
  const navigate = useNavigate();
  return (
    <div>
      <p>Agents list</p>
      <button type="button" onClick={() => navigate('/agents/new')}>
        Add agent
      </button>
    </div>
  );
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/agents/new']}>
      <Routes>
        <Route path="/agents/new" element={<AddAgentPage />} />
        <Route path="/agents" element={<AgentsStub />} />
      </Routes>
    </MemoryRouter>,
  );

const mockApi = (createReply: () => Response) => {
  const bodies: unknown[] = [];
  server.use(
    http.get('*/api/agents/groups', () => ok(['default', 'linux'])),
    http.post('*/api/agents/enrollment-links', async ({ request }) => {
      bodies.push(await request.json());
      return createReply();
    }),
  );
  return bodies;
};

const fillLinkForm = async (user: ReturnType<typeof userEvent.setup>, name = 'web-01') => {
  await user.click(screen.getByRole('radio', { name: /send a link/i }));
  await user.click(screen.getByRole('radio', { name: /linux \(deb\)/i }));
  await user.click(screen.getByRole('button', { name: 'arm64' }));
  await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('default'));
  await user.type(screen.getByPlaceholderText(/web-01/), name);
};

describe('Add agent: send a link', () => {
  beforeEach(() => {
    signInAs('admin');
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  });

  it('starts in command mode and offers the link mode alongside', () => {
    mockApi(() => ok(makeLink(), 201));
    renderPage();
    expect(screen.getByRole('radio', { name: /copy install command/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: /send a link/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('creates the link and shows it once, with its expiry and a warning', async () => {
    const user = userEvent.setup();
    const bodies = mockApi(() => ok(makeLink(), 201));
    renderPage();

    await fillLinkForm(user);
    await user.click(screen.getByRole('button', { name: 'Create link' }));

    expect(await screen.findByLabelText('Enrollment link')).toHaveTextContent(LINK_URL);
    expect(bodies).toEqual([
      { os: 'linux-deb', arch: 'arm64', group: 'default', agentName: 'web-01' },
    ]);
    expect(screen.getByText(/in 24 hours/)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/shown only once and works for one install/);
  });

  it('copies the link, and a ready-to-send message', async () => {
    const user = userEvent.setup();
    mockApi(() => ok(makeLink(), 201));
    renderPage();
    await fillLinkForm(user);
    await user.click(screen.getByRole('button', { name: 'Create link' }));
    await screen.findByLabelText('Enrollment link');

    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(await navigator.clipboard.readText()).toBe(LINK_URL);

    await user.click(screen.getByRole('button', { name: 'Copy message' }));
    const message = await navigator.clipboard.readText();
    expect(message).toContain('Install the SIEMple agent on web-01:');
    expect(message).toContain(LINK_URL);
    expect(message).toContain("Open this link on the computer you're installing the agent on.");
    expect(message).toMatch(/expires .+ \(in 24 hours\)/);
  });

  it('never shows the link again after leaving', async () => {
    const user = userEvent.setup();
    mockApi(() => ok(makeLink(), 201));
    renderPage();
    await fillLinkForm(user);
    await user.click(screen.getByRole('button', { name: 'Create link' }));
    await screen.findByLabelText('Enrollment link');

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('Agents list')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add agent' }));
    await user.click(screen.getByRole('radio', { name: /send a link/i }));

    expect(screen.queryByLabelText('Enrollment link')).not.toBeInTheDocument();
    expect(screen.queryByText(LINK_URL)).not.toBeInTheDocument();
  });

  it('needs a name before it can create a link', async () => {
    const user = userEvent.setup();
    mockApi(() => ok(makeLink(), 201));
    renderPage();
    await user.click(screen.getByRole('radio', { name: /send a link/i }));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('default'));
    expect(screen.getByRole('button', { name: 'Create link' })).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/finance-pc-07/), 'bad name');
    expect(screen.getByRole('button', { name: 'Create link' })).toBeDisabled();
  });

  it.each([
    [
      'a name that already has a pending link',
      'An enrollment link for this name is still pending. Revoke it, or choose another name',
    ],
    [
      'a name Wazuh already has',
      'An agent with this name is already registered. Choose another name, or remove the old agent in Wazuh first',
    ],
  ])('shows the 409 for %s and no link', async (_label, message) => {
    const user = userEvent.setup();
    mockApi(() => HttpResponse.json({ statusCode: 409, message, data: null }, { status: 409 }));
    renderPage();
    await fillLinkForm(user);
    await user.click(screen.getByRole('button', { name: 'Create link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByLabelText('Enrollment link')).not.toBeInTheDocument();
  });
});
