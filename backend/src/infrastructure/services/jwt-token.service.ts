import { injectable } from 'inversify';
import jwt from 'jsonwebtoken';
import { envConfig } from '../../config/env.config.ts';
import type {
  ITokenService,
  ITokenPayload,
} from '../../application/interfaces/services/token.service.interface.ts';

@injectable()
export class JwtTokenService implements ITokenService {
  private readonly _secret = envConfig.JWT_SECRET;
  private readonly _expiresIn = '15m';
  private readonly _algorithm = 'HS256' as const;

  generateAccessToken(payload: ITokenPayload): string {
    return jwt.sign(payload, this._secret, {
      expiresIn: this._expiresIn,
      algorithm: this._algorithm,
    });
  }

  verifyAccessToken(token: string): ITokenPayload {
    return jwt.verify(token, this._secret, { algorithms: [this._algorithm] }) as ITokenPayload;
  }
}
