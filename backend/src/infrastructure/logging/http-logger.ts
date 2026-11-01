import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { rootLogger } from './logger.ts';

// An id from the reverse proxy is reused, so its logs and ours can be matched up;
// anything else (missing, too long, odd characters) is replaced so it can't pollute logs
const REQUEST_ID = /^[\w.-]{1,128}$/;

// The query string is dropped: invite and reset links send their token as ?token=...
const pathOnly = (url: string | undefined) => (url ?? '').split('?')[0];

// One line per finished request, carrying a request id that every log written while
// handling it (req.log) shares. Only method, path, status, timing, IP and user agent
// are kept; headers, cookies and bodies never reach the log.
export const createHttpLogger = (logger: Logger) =>
  pinoHttp({
    logger,
    genReqId(req: IncomingMessage, res: ServerResponse) {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    // Health checks from Docker or a load balancer arrive every few seconds
    autoLogging: { ignore: (req) => pathOnly(req.url) === '/health' },
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${pathOnly(req.url)} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${pathOnly(req.url)} ${res.statusCode}`,
    serializers: {
      req: (req: { id: string; method: string; url: string; raw: IncomingMessage }) => ({
        id: req.id,
        method: req.method,
        path: pathOnly(req.url),
        // Express sets req.ip, honouring TRUST_PROXY; the socket address is the fallback
        ip: (req.raw as IncomingMessage & { ip?: string }).ip ?? req.raw.socket.remoteAddress,
        userAgent: req.raw.headers['user-agent'],
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });

export const httpLogger = createHttpLogger(rootLogger);
