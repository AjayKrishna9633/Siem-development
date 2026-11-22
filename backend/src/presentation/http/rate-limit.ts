import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

// Keyed by the signed-in user, so people behind one NAT don't share a budget. Mount after auth.
export const createUserRateLimiter = (limit: number, windowSeconds: number, message: string) =>
  rateLimit({
    windowMs: windowSeconds * 1000,
    limit,
    keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req.ip ?? ''),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, statusCode: 429, message, data: null },
  });

export const createRateLimiter = (
  limit: number,
  message: string,
  windowMinutes = 15,
  countFailuresOnly = false,
) =>
  rateLimit({
    windowMs: windowMinutes * 60_000,
    limit,
    skipSuccessfulRequests: countFailuresOnly,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, statusCode: 429, message, data: null },
  });
