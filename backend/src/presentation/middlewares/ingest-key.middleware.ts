import type { NextFunction, Request, Response } from 'express';
import type { IAuthenticateIngestKeyUseCase } from '../../application/interfaces/use-cases/ingest.interface.ts';

// For POST /api/ingest: the caller is a program holding an ingest key, not a signed-in person.
export function authenticateIngestKey(keys: IAuthenticateIngestKeyUseCase) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization ?? '';
    const secret = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    try {
      req.ingestKey = await keys.execute({ secret });
      next();
    } catch (err) {
      next(err);
    }
  };
}
