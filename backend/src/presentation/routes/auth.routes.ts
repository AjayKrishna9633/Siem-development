import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AuthController } from '../controllers/auth.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { sendOtpSchema, verifyOtpSchema, loginSchema } from '../validators/auth.schema.ts';

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
      data: null,
    },
  });

  const verifyOtpLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many OTP verification attempts, please try again later.',
      data: null,
    },
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many login attempts, please try again later.',
      data: null,
    },
  });

  router.post('/send-otp', otpLimiter, validate(sendOtpSchema), controller.sendOtp);

  router.post('/verify-otp', verifyOtpLimiter, validate(verifyOtpSchema), controller.verifyOtp);

  router.post('/login', loginLimiter, validate(loginSchema), controller.login);

  return router;
}
