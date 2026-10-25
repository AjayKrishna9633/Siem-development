import { Router } from 'express';
import type { AdminController } from '../controllers/admin.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { registerSuperAdminSchema } from '../validators/admin.schema.ts';
import { createRateLimiter } from '../http/rate-limit.ts';

export function adminRoutes(controller: AdminController): Router {
  const router = Router();

  const limiter = createRateLimiter(5, 'Too many registration attempts, please try again later.');

  router.post(
    '/register-super-admin',
    limiter,
    validate(registerSuperAdminSchema),
    controller.createSuperAdmin,
  );

  return router;
}
