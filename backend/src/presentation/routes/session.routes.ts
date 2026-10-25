import { Router } from 'express';
import type { SessionController } from '../controllers/session.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { loginSchema } from '../validators/auth.schema.ts';
import { createRateLimiter } from '../http/rate-limit.ts';

// Mounted at /api/auth
export function sessionRoutes(controller: SessionController): Router {
  const router = Router();

  const loginLimiter = createRateLimiter(10, 'Too many login attempts, please try again later.');
  // Refresh runs on every page load and every ~15 min, so it gets a wider budget
  const refreshLimiter = createRateLimiter(
    60,
    'Too many session refresh attempts, please try again later.',
  );

  router.post('/login', loginLimiter, validate(loginSchema), controller.login);
  router.post('/refresh', refreshLimiter, controller.refresh);
  router.post('/logout', controller.logout);

  return router;
}
