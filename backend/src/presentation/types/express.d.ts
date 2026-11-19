import type { ISessionUser } from '../../application/interfaces/use-cases/resolve-session-user.interface.ts';
import type { IIngestKeyIdentity } from '../../application/types/use-case/ingest.types.ts';

declare global {
  namespace Express {
    interface Request {
      user?: ISessionUser;
      // Set on POST /api/ingest once the ingest key checks out.
      ingestKey?: IIngestKeyIdentity;
    }
  }
}

export {};
