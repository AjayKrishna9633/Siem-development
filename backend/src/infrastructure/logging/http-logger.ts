import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { rootLogger } from './logger.ts';

const REQUEST_ID = /^[\w.-]{1,128}$/;

const HEALTH_PATHS = new Set(['/health', '/api/health']);

const UNMATCHED_ROUTE = 'unmatched';

type RoutedRequest = IncomingMessage & { routeTemplate?: string; ip?: string };

const pathOnly = (url: string | undefined) => (url ?? '').split('?')[0] ?? '';

// The route template ("/api/users/:id"), never the raw URL: ids and tokens stay out of the log,
// and every request to one route groups together in Grafana. Express sets req.route when a route
// matches, and req.baseUrl is the router's mount path at that moment. It is restored when the
// request leaves the router (an error handled at app level, for one), so it is read on the spot.
const captureRouteTemplate = (req: Request) => {
  let route: Request['route'];
  Object.defineProperty(req, 'route', {
    configurable: true,
    enumerable: true,
    get: () => route,
    set(value: Request['route']) {
      route = value;
      const path: unknown = value?.path;
      if (typeof path === 'string') {
        (req as RoutedRequest).routeTemplate = `${req.baseUrl}${path === '/' ? '' : path}` || '/';
      }
    },
  });
};

const routeOf = (req: IncomingMessage) => (req as RoutedRequest).routeTemplate ?? UNMATCHED_ROUTE;

export const createHttpLogger = (logger: Logger) => {
  const pinoMiddleware = pinoHttp({
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
    customSuccessMessage: (req, res) => `${req.method} ${routeOf(req)} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${routeOf(req)} ${res.statusCode}`,
    customAttributeKeys: { responseTime: 'durationMs' },
    // One flat line per request. Headers, cookies, bodies and the query string are never logged.
    // pino-http calls this when the request starts (for req.log, so every line logged while
    // handling it carries the request id) and again when the response is finished.
    customProps: (req, res) =>
      res.writableEnded
        ? {
            method: req.method,
            route: routeOf(req),
            status: res.statusCode,
            ip: (req as RoutedRequest).ip ?? req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
          }
        : { requestId: req.id },
    serializers: { req: () => undefined, res: () => undefined },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    captureRouteTemplate(req);
    pinoMiddleware(req, res, next);
  };
};

export const httpLogger = createHttpLogger(rootLogger);
