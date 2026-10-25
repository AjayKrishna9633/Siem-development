import { rateLimit } from 'express-rate-limit';

// Per-IP limit over a sliding window. A rejected request gets the API's usual JSON
// error shape, so the frontend shows `message` like any other error.
export const createRateLimiter = (limit: number, message: string, windowMinutes = 15) =>
  rateLimit({
    windowMs: windowMinutes * 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, statusCode: 429, message, data: null },
  });
