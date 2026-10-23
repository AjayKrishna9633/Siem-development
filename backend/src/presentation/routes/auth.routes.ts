import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AuthController } from '../controllers/auth.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import {
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validators/auth.schema.ts';
import { activateAccountSchema } from '../validators/user-mgmt.schema.ts';

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

  // Refresh runs on every page load and every ~15 min, so it gets a wider budget
  const refreshLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many session refresh attempts, please try again later.',
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

  router.post('/refresh', refreshLimiter, controller.refresh);
  router.post('/logout', controller.logout);

  router.get('/me', authMiddleware, controller.getMe);
  router.put('/profile', authMiddleware, validate(updateProfileSchema), controller.updateProfile);

  // Demo seeder for review presentation

  // Account activation: link ID + email + temporary password + new password
  const activationLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many activation attempts, please try again later.',
      data: null,
    },
  });
  router.get('/activation', activationLimiter, controller.getActivation);
  router.post('/activate', activationLimiter, validate(activateAccountSchema), controller.activate);

  return router;
}
