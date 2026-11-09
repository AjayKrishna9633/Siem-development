import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Toaster } from 'sonner';
import { server } from '../test/server.ts';
import { api } from './api.ts';

// End to end with the real sonner: a failed request makes a visible toast.
describe('global error toast', () => {
  it('shows the message on screen when a request fails', async () => {
    server.use(
      http.get('*/api/probe', () =>
        HttpResponse.json({ message: 'Ingest service is down' }, { status: 503 }),
      ),
    );
    render(<Toaster theme="dark" />);

    await api.get('/probe').catch(() => undefined);

    expect(await screen.findByText('Ingest service is down')).toBeInTheDocument();
  });
});
