import { Router } from 'express';
import type { SetupController } from '../controllers/setup.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { completeSetupSchema, verifySetupTokenSchema } from '../validators/setup.schema.ts';
import { createRateLimiter } from '../http/rate-limit.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

// Mounted at /api/setup. No authentication: the setup token is the credential.
export function setupRoutes(controller: SetupController): Router {
  const router = Router();

  // One budget for both routes: 5 failed attempts per IP per 15 minutes. Successful
  // requests don't count, so a normal verify-then-complete never trips it.
  const limiter = createRateLimiter(5, ErrorMessage.TOO_MANY_SETUP_ATTEMPTS, 15, true);

  router.post('/verify-token', limiter, validate(verifySetupTokenSchema), controller.verifyToken);
  router.post('/complete', limiter, validate(completeSetupSchema), controller.complete);

  return router;
}
