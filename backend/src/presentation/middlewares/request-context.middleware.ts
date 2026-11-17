import type { Request, Response, NextFunction } from 'express';
import type { IRequestContextProvider } from '../../application/interfaces/services/request-context.provider.interface.ts';
import { requestContextFrom } from '../http/request-context.ts';

// Opens the per-request scope that AuditService reads. Mounted after the body parsers as a
// precaution: they resume the request from stream callbacks, and AsyncLocalStorage has a history
// of dropping its store across those on some Node versions. On the Node version we test on it
// also works mounted earlier (tried), so this is cheap insurance, not a fix for a seen failure.
// The audit-trail integration test would catch a regression either way.
export const requestContextMiddleware =
  (provider: IRequestContextProvider) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const { ip, userAgent } = requestContextFrom(req);
    // pino-http (mounted first) assigned req.id, honouring a sane X-Request-Id from the caller.
    const requestId = req.id === undefined ? null : String(req.id);
    provider.run({ requestId, ip, userAgent, actor: null }, next);
  };
