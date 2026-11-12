import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env.config.ts';
import { REFRESH_TTL_SECONDS } from '../../infrastructure/services/refresh-session.service.ts';

export const REFRESH_COOKIE = 'refreshToken';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
};

export const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions, maxAge: REFRESH_TTL_SECONDS * 1000 });

export const clearRefreshCookie = (res: Response) => res.clearCookie(REFRESH_COOKIE, cookieOptions);

export const readRefreshCookie = (req: Request): string | null => {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : null;
};
