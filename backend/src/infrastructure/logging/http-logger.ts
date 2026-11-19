import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { rootLogger } from './logger.ts';

const REQUEST_ID = /^[\w.-]{1,128}$/;

const pathOnly = (url: string | undefined) => (url ?? '').split('?')[0] ?? '';

// The full request path. Inside a router mounted with app.use('/api/users', ...) Express shortens
// req.url to the part after the mount point, and the response can finish while it still is; the
// message is written then, so it would read "GET / 200". originalUrl is never shortened.
const fullPath = (req: IncomingMessage) =>
  pathOnly((req as IncomingMessage & { originalUrl?: string }).originalUrl ?? req.url);

const HEALTH_PATHS = new Set(['/health', '/api/health']);

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
    // Health checks arrive every few seconds from Docker; logging them would bury real traffic.
    autoLogging: { ignore: (req) => HEALTH_PATHS.has(pathOnly(req.url)) },
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${fullPath(req)} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${fullPath(req)} ${res.statusCode}`,
    serializers: {
      req: (req: { id: string; method: string; url: string; raw: IncomingMessage }) => ({
        id: req.id,
        method: req.method,
        path: pathOnly(req.url),
        ip: (req.raw as IncomingMessage & { ip?: string }).ip ?? req.raw.socket.remoteAddress,
        userAgent: req.raw.headers['user-agent'],
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });

export const httpLogger = createHttpLogger(rootLogger);
