import type { ISessionUser } from '../../application/interfaces/use-cases/resolve-session-user.interface.ts';

declare global {
  namespace Express {
    interface Request {
      user?: ISessionUser;
    }
  }
}

export {};
