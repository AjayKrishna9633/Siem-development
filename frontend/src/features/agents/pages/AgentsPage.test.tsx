import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server.ts';
import { AgentsPage } from './AgentsPage.tsx';
import { makeAgent, signInAs } from '../test-fixtures.ts';
import type { IAgent } from '../types/agent.types.ts';

const renderPage = (url = '/agents') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/new" element={<p>Add agent page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const mockAgents = (agents: IAgent[]) =>
  server.use(
    http.get('*/api/agents', () =>
      HttpResponse.json({ statusCode: 200, message: 'ok', data: agents }),
    ),
  );

describe('AgentsPage', () => {
  it('shows the Add agent button to admins and opens the stepper', async () => {
    const user = userEvent.setup();
    signInAs('admin');
    mockAgents([makeAgent()]);
    renderPage();

    expect(await screen.findByText('web-01')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add agent' }));
    expect(screen.getByText('Add agent page')).toBeInTheDocument();
  });

  it.each(['t1_analyst', 't2_analyst'] as const)('hides Add agent from %s', async (role) => {
    signInAs(role);
    mockAgents([makeAgent()]);
    renderPage();

    expect(await screen.findByText('web-01')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add agent' })).not.toBeInTheDocument();
  });

  it('lists status, IP, OS, version and groups, and highlights the linked agent', async () => {
    signInAs('t1_analyst');
    mockAgents([
      makeAgent(),
      makeAgent({
        wazuhId: '008',
        name: 'laptop-8',
        status: 'disconnected',
        groups: ['default', 'laptops'],
      }),
    ]);
    renderPage('/agents?agent=008');

    const row = (await screen.findByText('laptop-8')).closest('tr') as HTMLElement;
    expect(row).toHaveAttribute('aria-current', 'true');
    expect(row).toHaveTextContent('Disconnected');
    expect(row).toHaveTextContent('laptops');
    expect(screen.getByText('web-01').closest('tr')).not.toHaveAttribute('aria-current');
    expect(screen.getAllByText('192.168.1.50')).toHaveLength(2);
    expect(screen.getAllByText('Ubuntu 24.04.5 LTS')).toHaveLength(2);
  });

  it('explains an empty list, with the button for admins', async () => {
    signInAs('admin');
    mockAgents([]);
    renderPage();

    expect(await screen.findByText('No agents yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add agent' })).toBeInTheDocument();
  });

  it('shows the error when Wazuh is unreachable', async () => {
    signInAs('admin');
    server.use(
      http.get('*/api/agents', () =>
        HttpResponse.json(
          {
            statusCode: 503,
            data: null,
            message: "SIEMple can't reach the Wazuh manager.",
            code: 'AGENT_MANAGER_UNAVAILABLE',
          },
          { status: 503 },
        ),
      ),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "SIEMple can't reach the Wazuh manager.",
    );
  });
});
