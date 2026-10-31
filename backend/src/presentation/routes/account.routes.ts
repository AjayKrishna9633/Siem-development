import { Router, type RequestHandler } from 'express';
import type { AccountController } from '../controllers/account.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { requireRoles } from '../middlewares/auth.middleware.ts';
import {
  updateProfileSchema,
  changePasswordSchema,
  requestEmailChangeSchema,
  changeEmailSchema,
} from '../validators/auth.schema.ts';
import { createRateLimiter } from '../http/rate-limit.ts';
import { UserRole } from '../../domain/enums/UserRole.ts';

// Mounted at /api/auth. Every route needs a signed-in user.
export function accountRoutes(
  controller: AccountController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();

  // Password and email changes: a code is emailed first, then confirmed with the change
  const codeLimiter = createRateLimiter(
    5,
    'Too many verification codes requested, please try again later.',
  );
  const changeLimiter = createRateLimiter(10, 'Too many attempts, please try again later.');
  const adminOnly = requireRoles(UserRole.ADMIN);

  router.get('/me', authMiddleware, controller.getMe);
  router.put('/profile', authMiddleware, validate(updateProfileSchema), controller.updateProfile);

  router.post('/password/code', authMiddleware, codeLimiter, controller.requestPasswordChange);
  router.post(
    '/password',
    authMiddleware,
    changeLimiter,
    validate(changePasswordSchema),
    controller.changePassword,
  );

  // Analysts' emails are managed by admins, so only an admin changes their own
  router.post(
    '/email/code',
    authMiddleware,
    adminOnly,
    codeLimiter,
    validate(requestEmailChangeSchema),
    controller.requestEmailChange,
  );
  router.post(
    '/email',
    authMiddleware,
    adminOnly,
    changeLimiter,
    validate(changeEmailSchema),
    controller.changeEmail,
  );

  return router;
}
