import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server.ts';
import { ProtectedRoute } from '@/features/auth';
import { AddAgentPage } from './AddAgentPage.tsx';
import { SECRET, makeAgent, makeEnrollCommand, signInAs } from '../test-fixtures.ts';
import type { IEnrollmentCheck } from '../types/agent.types.ts';

vi.mock('../constants/enrollment.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../constants/enrollment.ts')>()),
  ENROLLMENT_POLL_MS: 20,
  ENROLLMENT_TIMEOUT_MS: 150,
}));

const ok = <T,>(data: T) => HttpResponse.json({ statusCode: 200, message: 'ok', data });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/agents/new']}>
      <Routes>
        <Route path="/agents/new" element={<AddAgentPage />} />
        <Route path="/agents" element={<p>Agents list</p>} />
      </Routes>
    </MemoryRouter>,
  );

interface IApiLog {
  enrollBodies: unknown[];
  checks: URLSearchParams[];
}

const mockApi = (checks: () => IEnrollmentCheck): IApiLog => {
  const log: IApiLog = { enrollBodies: [], checks: [] };
  server.use(
    http.get('*/api/agents/groups', () => ok(['default', 'linux'])),
    http.post('*/api/agents/enroll-command', async ({ request }) => {
      log.enrollBodies.push(await request.json());
      return ok(makeEnrollCommand());
    }),
    http.get('*/api/agents/enrollment-check', ({ request }) => {
      log.checks.push(new URL(request.url).searchParams);
      return ok(checks());
    }),
  );
  return log;
};

const commandText = () => screen.getByLabelText(/terminal/i, { selector: 'pre' }).textContent ?? '';

const goToCommand = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('radio', { name: /linux \(deb\)/i }));
  await user.click(screen.getByRole('button', { name: 'arm64' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('default'));
  await user.type(screen.getByPlaceholderText(/web-01/), 'web-01');
  await user.click(screen.getByRole('button', { name: 'Generate command' }));
  await screen.findByText(/contains the enrollment secret/i);
};

describe('AddAgentPage', () => {
  beforeEach(() => {
    signInAs('admin');
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  });
  afterEach(() => vi.restoreAllMocks());

  it('walks OS -> group and name -> command, sending exactly what was chosen', async () => {
    const user = userEvent.setup();
    const log = mockApi(() => ({ found: false, agent: null }));
    renderPage();

    expect(screen.getByRole('radio', { name: /windows/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText('Architecture')).not.toBeInTheDocument();
    await goToCommand(user);

    expect(log.enrollBodies).toEqual([
      { os: 'linux-deb', arch: 'arm64', group: 'default', agentName: 'web-01' },
    ]);
    expect(screen.getByText('Run in a terminal with sudo (or as root)')).toBeInTheDocument();
    expect(screen.getByLabelText('Connectivity check')).toHaveTextContent('nc -zv');
  });

  it('validates the agent name in the browser with the server rule', async () => {
    const user = userEvent.setup();
    const log = mockApi(() => ({ found: false, agent: null }));
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('default'));

    await user.type(screen.getByPlaceholderText(/finance-pc/), 'bad name;');
    expect(
      screen.getByText(/letters, digits, dots, hyphens and underscores only/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate command' })).toBeDisabled();
    expect(log.enrollBodies).toEqual([]);
  });

  it('shows the command masked, reveals it on request, and always copies the real one', async () => {
    const user = userEvent.setup();
    mockApi(() => ({ found: false, agent: null }));
    renderPage();
    await goToCommand(user);

    expect(commandText()).toContain('********');
    expect(commandText()).not.toContain(SECRET);

    await user.click(screen.getByRole('button', { name: /copy terminal/i }));
    expect(await navigator.clipboard.readText()).toContain(SECRET);
    expect(commandText()).not.toContain(SECRET);

    await user.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(commandText()).toContain(SECRET);
    await user.click(screen.getByRole('button', { name: 'Hide' }));
    expect(commandText()).not.toContain(SECRET);
  });

  it('copies through the fallback on a plain-HTTP install', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    let copied = '';
    document.execCommand = vi.fn(() => {
      copied = document.querySelector('textarea')?.value ?? '';
      return true;
    });
    mockApi(() => ({ found: false, agent: null }));
    renderPage();
    await goToCommand(user);

    await user.click(screen.getByRole('button', { name: /copy terminal/i }));
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(copied).toContain(SECRET);
    expect(await screen.findByRole('button', { name: /copy terminal/i })).toHaveTextContent(
      'Copied',
    );
  });

  it('shows the server message when the command cannot be generated', async () => {
    const user = userEvent.setup();
    mockApi(() => ({ found: false, agent: null }));
    server.use(
      http.post('*/api/agents/enroll-command', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            data: null,
            message:
              'Set WAZUH_PUBLIC_ADDRESS in .env to the address agents use to reach this server',
            code: 'AGENT_ENROLLMENT_NOT_CONFIGURED',
          },
          { status: 409 },
        ),
      ),
    );
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('default'));
    await user.click(screen.getByRole('button', { name: 'Generate command' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Set WAZUH_PUBLIC_ADDRESS in .env');
  });

  it('waits for the agent and flips to Connected once it is active', async () => {
    const user = userEvent.setup();
    const replies: IEnrollmentCheck[] = [
      { found: false, agent: null },
      { found: true, agent: makeAgent({ status: 'pending', ip: null }) },
      { found: true, agent: makeAgent() },
    ];
    const log = mockApi(() => replies.shift() ?? { found: true, agent: makeAgent() });
    renderPage();
    await goToCommand(user);
    await user.click(screen.getByRole('button', { name: /i ran it/i }));

    expect(screen.getByText('Waiting for agent...')).toBeInTheDocument();
    const connected = await screen.findByText('Connected');
    const panel = connected.closest('section') as HTMLElement;
    expect(within(panel).getByText('web-01')).toBeInTheDocument();
    expect(within(panel).getByText('Ubuntu 24.04.5 LTS')).toBeInTheDocument();
    expect(within(panel).getByText('192.168.1.50')).toBeInTheDocument();
    expect(within(panel).getByText('v4.14.10')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /view the agent/i })).toHaveAttribute(
      'href',
      '/agents?agent=007',
    );

    expect(log.checks[0]?.get('agentName')).toBe('web-01');
    expect(log.checks[0]?.get('since')).toBe('2026-11-22T10:00:00.000Z');
    const count = log.checks.length;
    await new Promise((r) => setTimeout(r, 80));
    expect(log.checks.length).toBe(count);
  });

  it('shows troubleshooting after the timeout and keeps waiting', async () => {
    const user = userEvent.setup();
    const log = mockApi(() => ({ found: false, agent: null }));
    renderPage();
    await goToCommand(user);
    await user.click(screen.getByRole('button', { name: /i ran it/i }));

    expect(await screen.findByText("The agent hasn't connected yet")).toBeInTheDocument();
    for (const tip of [
      'Ports blocked',
      'Not run as administrator',
      'An old agent is installed',
      'Wrong server address',
    ]) {
      expect(screen.getByText(`${tip}.`)).toBeInTheDocument();
    }
    const count = log.checks.length;
    await waitFor(() => expect(log.checks.length).toBeGreaterThan(count));
  });

  it.each(['t1_analyst', 't2_analyst'] as const)(
    'sends %s to /unauthorized (route guard: agents.manage)',
    (role) => {
      signInAs(role);
      render(
        <MemoryRouter initialEntries={['/agents/new']}>
          <Routes>
            <Route
              path="/agents/new"
              element={
                <ProtectedRoute permission="agents.manage">
                  <AddAgentPage />
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<p>Unauthorized page</p>} />
          </Routes>
        </MemoryRouter>,
      );
      expect(screen.getByText('Unauthorized page')).toBeInTheDocument();
      expect(screen.queryByText('Add agent')).not.toBeInTheDocument();
    },
  );
});
