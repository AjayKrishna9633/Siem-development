import { Router } from 'express';
import type { InviteController } from '../controllers/invite.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { acceptInviteSchema } from '../validators/user-mgmt.schema.ts';
import { createRateLimiter } from '../http/rate-limit.ts';

// Mounted at /api/auth. Public: the invite link itself proves who the caller is.
export function inviteRoutes(controller: InviteController): Router {
  const router = Router();

  // Links are 256-bit random values, so this only slows down noise, not real guessing
  const limiter = createRateLimiter(20, 'Too many invitation attempts, please try again later.');

  router.get('/invite', limiter, controller.preview);
  router.post('/invite/accept', limiter, validate(acceptInviteSchema), controller.accept);

  return router;
}
