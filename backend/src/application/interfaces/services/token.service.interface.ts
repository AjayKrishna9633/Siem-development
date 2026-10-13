export interface ITokenPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string | null;
  tokenVersion: number;
}

export interface ITokenService {
  generateAccessToken(payload: ITokenPayload): string;
  verifyAccessToken(token: string): ITokenPayload;
}
