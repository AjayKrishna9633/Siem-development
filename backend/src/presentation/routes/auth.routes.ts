import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { sendOtpSchema } from '../validators/auth.schema.js';

export function authRoutes(controller: AuthController): Router {
  const router = Router();

  const otpLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many OTP requests, please try again later.',
      data: null
    }
  });

  router.post(
    '/send-otp',
    otpLimiter,
    validate(sendOtpSchema),
    controller.sendOtp
  );

  return router;
}
