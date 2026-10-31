import { rateLimit } from 'express-rate-limit';

// Per-IP limit over a sliding window. A rejected request gets the API's usual JSON
// error shape, so the frontend shows `message` like any other error.
// `countFailuresOnly`: successful requests (status < 400) are not counted, so the limit
// applies to wrong guesses rather than to normal use
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
