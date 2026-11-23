import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { http, HttpResponse } from 'msw';
import { Toaster } from 'sonner';
import { server } from '@/test/server.ts';
import { EmailSettingsPage } from './EmailSettingsPage.tsx';
import type { IEmailSettings } from '../types/emailSettings.types.ts';

const ok = <T,>(data: T) => HttpResponse.json({ statusCode: 200, message: 'ok', data });

const none: IEmailSettings = {
  source: 'none',
  host: null,
  port: null,
  security: 'starttls',
  username: null,
  fromAddress: null,
  fromName: null,
  enabled: false,
  passwordSet: false,
  lastTest: null,
  encryptionKeyConfigured: true,
};

const configured: IEmailSettings = {
  ...none,
  source: 'database',
  host: 'smtp.gmail.com',
  port: 587,
  username: 'siem@example.com',
  fromAddress: 'siem@example.com',
  fromName: 'SIEMple',
  enabled: true,
  passwordSet: true,
};

interface IApiLog {
  saved: unknown[];
  tests: unknown[];
  deletes: number;
}

const mockApi = (initial: IEmailSettings): IApiLog => {
  const log: IApiLog = { saved: [], tests: [], deletes: 0 };
  let current = initial;
  server.use(
    http.get('*/api/settings/email', () => ok(current)),
    http.put('*/api/settings/email', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      log.saved.push(body);
      current = {
        ...current,
        source: 'database',
        enabled: true,
        host: String(body.host),
        port: Number(body.port),
        passwordSet: current.passwordSet || body.password !== '',
      };
      return ok(current);
    }),
    http.post('*/api/settings/email/test', async ({ request }) => {
      const body = (await request.json()) as { to?: string };
      log.tests.push(body);
      return body.to === 'fail@example.com'
        ? ok({
            ok: false,
            to: body.to,
            category: 'auth_failed',
            responseCode: 535,
            message: 'The mail server rejected the username or password.',
          })
        : ok({ ok: true, to: body.to ?? 'admin@example.com' });
    }),
    http.delete('*/api/settings/email', () => {
      log.deletes += 1;
      current = { ...current, source: 'none', enabled: false, passwordSet: false };
      return ok(current);
    }),
  );
  return log;
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <EmailSettingsPage />
      <Toaster />
    </MemoryRouter>,
  );

describe('EmailSettingsPage', () => {
  it('shows Not configured, with no test or disable controls', async () => {
    mockApi(none);
    renderPage();
    expect(await screen.findByText('Not configured')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send test email' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable email' })).not.toBeInTheDocument();
  });

  it('fills only the server fields from a preset, with the Gmail App Password hint', async () => {
    const user = userEvent.setup();
    mockApi(none);
    renderPage();
    await screen.findByText('Not configured');

    await user.type(screen.getByLabelText(/username/i), 'me@example.com');
    await user.click(screen.getByRole('radio', { name: 'Gmail' }));
    expect(screen.getByPlaceholderText('smtp.example.com')).toHaveValue('smtp.gmail.com');
    expect(screen.getByRole('spinbutton')).toHaveValue(587);
    expect(screen.getByLabelText('Security')).toHaveValue('starttls');
    expect(screen.getByLabelText(/username/i)).toHaveValue('me@example.com');
    expect(screen.getByRole('link', { name: /app password/i })).toHaveAttribute(
      'href',
      'https://support.google.com/accounts/answer/185833',
    );

    await user.click(screen.getByRole('radio', { name: 'Microsoft 365' }));
    expect(screen.getByPlaceholderText('smtp.example.com')).toHaveValue('smtp.office365.com');
    expect(screen.queryByRole('link', { name: /app password/i })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('smtp.example.com'), 'x');
    expect(screen.getByRole('radio', { name: 'Custom' })).toHaveAttribute('aria-checked', 'true');
  });

  it('suggests the port for the security mode, but keeps a custom port', async () => {
    const user = userEvent.setup();
    mockApi(none);
    renderPage();
    await screen.findByText('Not configured');

    await user.selectOptions(screen.getByLabelText('Security'), 'tls');
    expect(screen.getByRole('spinbutton')).toHaveValue(465);
    await user.selectOptions(screen.getByLabelText('Security'), 'none');
    expect(screen.getByText(/plain text/i)).toBeInTheDocument();

    await user.clear(screen.getByRole('spinbutton'));
    await user.type(screen.getByRole('spinbutton'), '2525');
    await user.selectOptions(screen.getByLabelText('Security'), 'starttls');
    expect(screen.getByRole('spinbutton')).toHaveValue(2525);
  });

  it('never prefills a saved password, and keeps it unless Change is used', async () => {
    const user = userEvent.setup();
    const log = mockApi(configured);
    renderPage();
    expect(await screen.findByText('Configured')).toBeInTheDocument();

    const saved = screen.getByLabelText('Saved password');
    expect(saved).toBeDisabled();
    expect(saved).toHaveValue('');
    expect(saved).toHaveAttribute('placeholder', '•••• saved');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(log.saved).toHaveLength(1));
    expect(log.saved[0]).toEqual({
      host: 'smtp.gmail.com',
      port: 587,
      security: 'starttls',
      username: 'siem@example.com',
      password: '',
      fromAddress: 'siem@example.com',
      fromName: 'SIEMple',
    });

    await user.click(screen.getByRole('button', { name: 'Change' }));
    const input = screen.getByLabelText('Password');
    expect(input).toHaveValue('');
    await user.type(input, 'new-app-password');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(log.saved).toHaveLength(2));
    expect(log.saved[1]).toMatchObject({ password: 'new-app-password' });
    expect(await screen.findAllByText(/email settings saved/i)).not.toHaveLength(0);
  });

  it('sends a test email to me or to another address, and shows the result', async () => {
    const user = userEvent.setup();
    const log = mockApi(configured);
    renderPage();
    await screen.findByText('Configured');

    await user.click(screen.getByRole('button', { name: 'Send test email' }));
    expect(await screen.findByText(/test email sent to admin@example.com/i)).toBeInTheDocument();
    expect(log.tests[0]).toEqual({});

    await user.click(screen.getByRole('radio', { name: 'To another address' }));
    await user.type(screen.getByLabelText('Test recipient'), 'fail@example.com');
    await user.click(screen.getByRole('button', { name: 'Send test email' }));
    expect(
      await screen.findByText('The mail server rejected the username or password. (SMTP 535)'),
    ).toBeInTheDocument();
    expect(log.tests[1]).toEqual({ to: 'fail@example.com' });
  });

  it('keeps the test result on screen right after setting email up for the first time', async () => {
    const user = userEvent.setup();
    mockApi(none);
    renderPage();
    await screen.findByText('Not configured');

    await user.click(screen.getByRole('radio', { name: 'Gmail' }));
    await user.type(screen.getByLabelText(/username/i), 'me@example.com');
    await user.type(screen.getByLabelText('Password'), 'app-password');
    await user.type(screen.getByPlaceholderText('siem@example.com'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(await screen.findByRole('button', { name: 'Send test email' }));

    expect(await screen.findByText(/test email sent to admin@example.com/i)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText(/test email sent to admin@example.com/i)).toBeInTheDocument();
    expect(screen.getByText('Configured')).toBeInTheDocument();
  });

  it('turns email off after confirmation', async () => {
    const user = userEvent.setup();
    const log = mockApi(configured);
    renderPage();
    await screen.findByText('Configured');

    await user.click(screen.getByRole('button', { name: 'Disable email' }));
    const dialog = screen.getByRole('dialog');
    expect(log.deletes).toBe(0);
    await user.click(within(dialog).getByRole('button', { name: 'Disable email' }));
    expect(await screen.findByText('Not configured')).toBeInTheDocument();
    expect(log.deletes).toBe(1);
  });

  it('shows .env-managed settings read-only, with test but no form or disable', async () => {
    mockApi({ ...configured, source: 'env', host: 'smtp.env.example', port: 465, security: 'tls' });
    renderPage();
    expect(await screen.findByText("Managed by the server's .env")).toBeInTheDocument();
    expect(screen.getByText('smtp.env.example:465')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable email' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send test email' })).toBeInTheDocument();
  });

  it('turns saving off when the encryption key is not configured', async () => {
    mockApi({ ...none, encryptionKeyConfigured: false });
    renderPage();
    expect(await screen.findByText(/encryption key not configured/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
