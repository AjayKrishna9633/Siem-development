import { injectable } from 'inversify';
import jwt from 'jsonwebtoken';
import { envConfig } from '../../config/env.config.ts';
import type {
  ITokenService,
  ITokenPayload,
} from '../../application/interfaces/services/token.service.interface.ts';

@injectable()
export class JwtTokenService implements ITokenService {
  private readonly secret = envConfig.JWT_SECRET;
  // Short-lived: the refresh cookie re-issues it, so a leaked token expires quickly
  private readonly expiresIn = '15m';
  // Pinned on both sides, so a token can't pick a weaker algorithm (or 'none') for itself
  private readonly algorithm = 'HS256' as const;

  generateAccessToken(payload: ITokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      algorithm: this.algorithm,
    });
  }

  verifyAccessToken(token: string): ITokenPayload {
    return jwt.verify(token, this.secret, { algorithms: [this.algorithm] }) as ITokenPayload;
  }
}
