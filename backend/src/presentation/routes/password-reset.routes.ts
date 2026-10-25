import { Router } from 'express';
import type { PasswordResetController } from '../controllers/password-reset.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { sendOtpSchema, verifyOtpSchema, resetPasswordSchema } from '../validators/auth.schema.ts';
import { createRateLimiter } from '../http/rate-limit.ts';

// Mounted at /api/auth
export function passwordResetRoutes(controller: PasswordResetController): Router {
  const router = Router();

  const sendLimiter = createRateLimiter(5, 'Too many OTP requests, please try again later.');
  const verifyLimiter = createRateLimiter(
    10,
    'Too many OTP verification attempts, please try again later.',
  );
  const resetLimiter = createRateLimiter(
    5,
    'Too many password reset attempts, please try again later.',
  );

  router.post('/send-otp', sendLimiter, validate(sendOtpSchema), controller.sendOtp);
  router.post('/verify-otp', verifyLimiter, validate(verifyOtpSchema), controller.verifyOtp);
  router.post(
    '/reset-password',
    resetLimiter,
    validate(resetPasswordSchema),
    controller.resetPassword,
  );

  return router;
}
