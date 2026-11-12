import { describe, expect, it } from 'vitest';
import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { shouldToast } from './errors.ts';

const config = (extra: Partial<InternalAxiosRequestConfig> = {}): InternalAxiosRequestConfig => ({
  headers: new AxiosHeaders(),
  ...extra,
});

const failed = (status: number, data: unknown = {}, extra = {}) =>
  new AxiosError('failed', 'ERR_BAD_RESPONSE', config(extra), null, {
    status,
    statusText: '',
    data,
    headers: {},
    config: config(extra),
  });

describe('shouldToast', () => {
  it.each([500, 502, 503, 429, 403])('toasts a %i response', (status) => {
    expect(shouldToast(failed(status))).toBe(true);
  });

  it.each([400, 401, 404, 409, 422])('leaves a %i response to the caller', (status) => {
    expect(shouldToast(failed(status))).toBe(false);
  });

  it('toasts when the server cannot be reached', () => {
    expect(shouldToast(new AxiosError('Network Error', 'ERR_NETWORK', config()))).toBe(true);
  });

  it('skips SETUP_REQUIRED, which redirects instead', () => {
    expect(shouldToast(failed(403, { code: 'SETUP_REQUIRED' }))).toBe(false);
  });

  it('skips requests that opted out', () => {
    expect(shouldToast(failed(500, {}, { skipGlobalError: true }))).toBe(false);
  });

  it('skips cancelled requests and non-axios errors', () => {
    expect(shouldToast(new axios.CanceledError())).toBe(false);
    expect(shouldToast(new Error('boom'))).toBe(false);
  });
});
