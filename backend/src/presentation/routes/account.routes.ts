import { Router, type RequestHandler } from 'express';
import type { AccountController } from '../controllers/account.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { authorize } from '../middlewares/auth.middleware.ts';
import {
  updateProfileSchema,
  changePasswordSchema,
  requestEmailChangeSchema,
  changeEmailSchema,
} from '../validators/auth.schema.ts';
import { createRateLimiter } from '../http/rate-limit.ts';
import { Permission } from '../../domain/enums/Permission.ts';

// Mounted at /api/auth. Every route needs a signed-in user.
export function accountRoutes(
  controller: AccountController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();

  // Email changes: a code is emailed to the new address first, then confirmed
  const codeLimiter = createRateLimiter(
    5,
    'Too many verification codes requested, please try again later.',
  );
  // Also limits guessing the current password with a stolen session
  const changeLimiter = createRateLimiter(10, 'Too many attempts, please try again later.');
  const canManageUsers = authorize(Permission.USERS_MANAGE);

  router.get('/me', authMiddleware, controller.getMe);
  router.put('/profile', authMiddleware, validate(updateProfileSchema), controller.updateProfile);

  router.post(
    '/password',
    authMiddleware,
    changeLimiter,
    validate(changePasswordSchema),
    controller.changePassword,
  );

  // Analysts' emails are managed by admins, so only someone who manages users changes their own
  router.post(
    '/email/code',
    authMiddleware,
    canManageUsers,
    codeLimiter,
    validate(requestEmailChangeSchema),
    controller.requestEmailChange,
  );
  router.post(
    '/email',
    authMiddleware,
    canManageUsers,
    changeLimiter,
    validate(changeEmailSchema),
    controller.changeEmail,
  );

  return router;
}
