import type { ITokenPayload } from '../../application/interfaces/services/token.service.interface.ts';

declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;
    }
  }
}

export {};
