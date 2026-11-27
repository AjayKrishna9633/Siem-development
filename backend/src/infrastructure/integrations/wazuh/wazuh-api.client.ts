import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import type { ICacheService } from '../../../application/interfaces/services/cache.service.interface.ts';
import type { ILogger } from '../../../application/interfaces/services/logger.interface.ts';
import { AppError } from '../../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../../domain/enums/ErrorMessage.ts';

export interface IWazuhApiConfig {
  baseUrl: string;
  username: string | undefined;
  password: string | undefined;
  caFile: string | undefined;
  tlsInsecure: boolean;
  timeoutMs?: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface IHttpRequest {
  method: HttpMethod;
  url: URL;
  headers: Record<string, string>;
  body?: string;
}

export interface IWazuhResponse<T> {
  status: number;
  body: T;
}

export interface IHttpResponse {
  status: number;
  body: string;
}

export type HttpTransport = (request: IHttpRequest) => Promise<IHttpResponse>;

const TOKEN_CACHE_KEY = 'wazuh:api-token';
// Wazuh issues tokens for 900 seconds; refresh a minute early.
const TOKEN_TTL_SECONDS = 840;
const DEFAULT_TIMEOUT_MS = 5_000;

const errorReason = (err: unknown): string => {
  if (!(err instanceof Error)) return String(err);
  const code = (err as NodeJS.ErrnoException).code;
  return err.message || code || err.name;
};

export const createHttpTransport = (config: IWazuhApiConfig, logger: ILogger): HttpTransport => {
  const timeout = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const secure = new URL(config.baseUrl).protocol === 'https:';
  if (secure && config.tlsInsecure) {
    logger.warn(
      'WAZUH_API_TLS_INSECURE=true: the Wazuh API certificate is NOT verified. Set WAZUH_API_CA_FILE instead',
    );
  }

  // Built on first use: the manager writes the CA file on its first start, which can be after ours.
  let agent: http.Agent | undefined;
  const agentFor = (): http.Agent => {
    if (agent) return agent;
    agent = secure
      ? new https.Agent({
          keepAlive: true,
          rejectUnauthorized: !config.tlsInsecure,
          ...(config.caFile && !config.tlsInsecure && { ca: readFileSync(config.caFile) }),
        })
      : new http.Agent({ keepAlive: true });
    return agent;
  };

  return (request) =>
    new Promise((resolve, reject) => {
      let agent: http.Agent;
      try {
        agent = agentFor();
      } catch (err) {
        reject(new Error(`Cannot read WAZUH_API_CA_FILE: ${errorReason(err)}`));
        return;
      }
      const send = secure ? https.request : http.request;
      const req = send(
        request.url,
        { method: request.method, headers: request.headers, agent, timeout },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () =>
            resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }),
          );
          res.on('error', reject);
        },
      );
      req.on('timeout', () => req.destroy(new Error(`Timed out after ${timeout} ms`)));
      req.on('error', reject);
      req.end(request.body);
    });
};

export class WazuhApiClient {
  private readonly _logger: ILogger;

  constructor(
    private readonly _config: IWazuhApiConfig,
    private readonly _cache: ICacheService,
    logger: ILogger,
    private readonly _transport: HttpTransport,
  ) {
    this._logger = logger.child({ module: 'wazuh-api' });
  }

  // Authenticated GET that expects 200.
  async get<T>(path: string, query: Record<string, string> = {}): Promise<T> {
    const res = await this.request<T>('GET', path, { query });
    if (res.status !== 200)
      throw this.unavailable('Unexpected status', { path, status: res.status });
    return res.body;
  }

  // Any authenticated call; the caller decides what each status means, because Wazuh reports
  // some failures as 4xx and others inside a 200. A 401 means the cached token expired or was
  // revoked: log in again once.
  async request<T>(
    method: HttpMethod,
    path: string,
    { query = {}, body }: { query?: Record<string, string>; body?: unknown } = {},
  ): Promise<IWazuhResponse<T>> {
    const url = new URL(path, this._config.baseUrl);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const headers = (token: string): Record<string, string> => ({
      Authorization: `Bearer ${token}`,
      ...(payload !== undefined && {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload)),
      }),
    });

    let token = await this.token();
    let res = await this.send({
      method,
      url,
      headers: headers(token),
      ...(payload !== undefined && { body: payload }),
    });
    if (res.status === 401) {
      await this._cache.delete(TOKEN_CACHE_KEY);
      token = await this.token();
      res = await this.send({
        method,
        url,
        headers: headers(token),
        ...(payload !== undefined && { body: payload }),
      });
    }
    return { status: res.status, body: this.parse<T>(res.body, url.pathname) };
  }

  private async token(): Promise<string> {
    const cached = await this._cache.get<string>(TOKEN_CACHE_KEY);
    if (cached) return cached;

    const { username, password } = this._config;
    if (!username || !password) {
      throw this.unavailable('WAZUH_API_USER and WAZUH_API_PASSWORD are not set');
    }
    const basic = Buffer.from(`${username}:${password}`).toString('base64');
    const res = await this.send({
      method: 'POST',
      url: new URL('/security/user/authenticate', this._config.baseUrl),
      headers: { Authorization: `Basic ${basic}` },
    });
    if (res.status !== 200) throw this.unavailable('Login failed', { status: res.status });

    const token = this.parse<{ data?: { token?: unknown } }>(res.body, 'authenticate').data?.token;
    if (typeof token !== 'string' || token === '')
      throw this.unavailable('Login returned no token');
    await this._cache.set(TOKEN_CACHE_KEY, token, TOKEN_TTL_SECONDS);
    return token;
  }

  private async send(request: IHttpRequest): Promise<IHttpResponse> {
    try {
      return await this._transport(request);
    } catch (err) {
      throw this.unavailable('Request failed', {
        path: request.url.pathname,
        reason: errorReason(err),
      });
    }
  }

  private parse<T>(body: string, path: string): T {
    try {
      return JSON.parse(body) as T;
    } catch {
      throw this.unavailable('Response is not JSON', { path });
    }
  }

  // Logs why and returns the error to throw, so a caller never shows Wazuh's reply to users.
  unavailable(reason: string, fields: Record<string, unknown> = {}): AppError {
    this._logger.warn(`Wazuh API: ${reason}`, fields);
    return new AppError(
      AppErrorCode.AGENT_MANAGER_UNAVAILABLE,
      ErrorMessage.AGENT_MANAGER_UNAVAILABLE,
    );
  }
}
