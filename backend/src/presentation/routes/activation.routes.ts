import { Router } from 'express';
import type { ActivationController } from '../controllers/activation.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { activateAccountSchema, verifyActivationSchema } from '../validators/user-mgmt.schema.ts';
import { createRateLimiter } from '../http/rate-limit.ts';

// Mounted at /api/auth. The link (or email + temporary password) opens the set-password step.
export function activationRoutes(controller: ActivationController): Router {
  const router = Router();

  const limiter = createRateLimiter(20, 'Too many activation attempts, please try again later.');

  router.get('/activation', limiter, controller.getActivation);
  router.post(
    '/activation/verify',
    limiter,
    validate(verifyActivationSchema),
    controller.verifyActivation,
  );
  router.post('/activate', limiter, validate(activateAccountSchema), controller.activate);

  return router;
}
