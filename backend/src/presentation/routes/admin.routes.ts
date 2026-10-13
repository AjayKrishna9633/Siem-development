import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AdminController } from '../controllers/admin.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { registerSuperAdminSchema } from '../validators/admin.schema.ts';

export function adminRoutes(controller: AdminController): Router {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many registration attempts, please try again later.',
      data: null,
    },
  });

  router.post(
    '/register-super-admin',
    limiter,
    validate(registerSuperAdminSchema),
    controller.createSuperAdmin,
  );

  return router;
}
