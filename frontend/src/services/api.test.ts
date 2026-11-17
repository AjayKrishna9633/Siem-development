import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { server } from '@/test/server.ts';
import { api, INLINE_ERRORS, setAccessToken } from './api.ts';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const session = {
  accessToken: 'fresh-token',
  user: { id: 'u1', email: 'a@siemple.local', username: 'A', role: 'admin' },
};

describe('api response interceptor', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
    setAccessToken(null);
  });

  it('toasts a server error and still rejects', async () => {
    server.use(
      http.get('*/api/probe', () =>
        HttpResponse.json({ message: 'Database unavailable' }, { status: 500 }),
      ),
    );
    await expect(api.get('/probe')).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledWith('Database unavailable', {
      id: 'Database unavailable',
    });
  });

  it('toasts when the server cannot be reached', async () => {
    server.use(http.get('*/api/probe', () => HttpResponse.error()));
    await expect(api.get('/probe')).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledWith('Cannot reach the SIEMple server.', {
      id: 'Cannot reach the SIEMple server.',
    });
  });

  it('does not toast a validation error, which the form shows', async () => {
    server.use(
      http.post('*/api/probe', () => HttpResponse.json({ message: 'Bad' }, { status: 400 })),
    );
    await expect(api.post('/probe', {})).rejects.toThrow();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not toast a request that opted out', async () => {
    server.use(http.get('*/api/probe', () => new HttpResponse(null, { status: 500 })));
    await expect(api.get('/probe', INLINE_ERRORS)).rejects.toThrow();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('refreshes an expired token silently and retries without a toast', async () => {
    server.use(
      http.get('*/api/probe', ({ request }) =>
        request.headers.get('authorization') === 'Bearer fresh-token'
          ? HttpResponse.json({ data: 'ok' })
          : new HttpResponse(null, { status: 401 }),
      ),
      http.post('*/api/auth/refresh', () => HttpResponse.json({ data: session })),
    );
    const res = await api.get('/probe');
    expect(res.data).toEqual({ data: 'ok' });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('toasts once that the session expired when the refresh fails', async () => {
    server.use(
      http.get('*/api/probe', () => new HttpResponse(null, { status: 401 })),
      http.post('*/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    );
    await expect(api.get('/probe')).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Your session expired. Sign in again.', {
      id: 'Your session expired. Sign in again.',
    });
  });

  it('gives identical failures the same id so they merge into one toast', async () => {
    server.use(http.get('*/api/probe', () => HttpResponse.error()));
    await Promise.allSettled(Array.from({ length: 5 }, () => api.get('/probe')));
    const ids = vi.mocked(toast.error).mock.calls.map(([, options]) => options?.id);
    expect(new Set(ids)).toEqual(new Set(['Cannot reach the SIEMple server.']));
  });
});
