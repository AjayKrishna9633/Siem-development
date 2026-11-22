import type { Request, Response, NextFunction } from 'express';
import type { IRequestContextProvider } from '../../application/interfaces/services/request-context.provider.interface.ts';
import { requestContextFrom } from '../http/request-context.ts';

export const requestContextMiddleware =
  (provider: IRequestContextProvider) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const { ip, userAgent } = requestContextFrom(req);
    const requestId = req.id === undefined ? null : String(req.id);
    provider.run({ requestId, ip, userAgent, actor: null }, next);
  };
