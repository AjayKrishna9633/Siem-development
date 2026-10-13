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
  private readonly expiresIn = '1h';

  generateAccessToken(payload: ITokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verifyAccessToken(token: string): ITokenPayload {
    return jwt.verify(token, this.secret) as ITokenPayload;
  }
}
