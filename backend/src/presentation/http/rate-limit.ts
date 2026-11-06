import { rateLimit } from 'express-rate-limit';

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
