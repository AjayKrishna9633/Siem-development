export interface ITokenPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
}

export interface ITokenService {
  generateAccessToken(payload: ITokenPayload): string;
  verifyAccessToken(token: string): ITokenPayload;
}
