import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AuthController } from '../controllers/auth.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import {
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  resetPasswordSchema,
} from '../validators/auth.schema.ts';

export function authRoutes(controller: AuthController, authMiddleware: RequestHandler): Router {
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

  const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many password reset attempts, please try again later.',
      data: null,
    },
  });

  router.post('/send-otp', otpLimiter, validate(sendOtpSchema), controller.sendOtp);

  router.post('/verify-otp', verifyOtpLimiter, validate(verifyOtpSchema), controller.verifyOtp);

  router.post('/login', loginLimiter, validate(loginSchema), controller.login);

  router.post(
    '/reset-password',
    resetPasswordLimiter,
    validate(resetPasswordSchema),
    controller.resetPassword,
  );

  router.get('/me', authMiddleware, controller.getMe);

  return router;
}
