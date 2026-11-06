import { Router } from 'express';
import type { PasswordResetController } from '../controllers/password-reset.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { requestPasswordResetSchema, resetPasswordSchema } from '../validators/auth.schema.ts';
import { createRateLimiter } from '../http/rate-limit.ts';

export function passwordResetRoutes(controller: PasswordResetController): Router {
  const router = Router();

  const requestLimiter = createRateLimiter(5, 'Too many reset requests, please try again later.');
  const linkLimiter = createRateLimiter(
    20,
    'Too many password reset attempts, please try again later.',
  );

  router.post(
    '/password-reset/request',
    requestLimiter,
    validate(requestPasswordResetSchema),
    controller.request,
  );
  router.get('/password-reset', linkLimiter, controller.preview);
  router.post('/password-reset', linkLimiter, validate(resetPasswordSchema), controller.reset);

  return router;
}
