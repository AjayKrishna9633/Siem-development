import { Router, type RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { EmailSettingsController } from '../controllers/email-settings.controller.ts';
import { authorize } from '../middlewares/auth.middleware.ts';
import { Permission } from '../../domain/enums/Permission.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

// Per admin, not per IP, so admins behind one NAT don't share a budget. Mounted after auth.
const testLimiter = () =>
  rateLimit({
    windowMs: 60_000,
    limit: 5,
    keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req.ip ?? ''),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: ErrorMessage.TOO_MANY_EMAIL_TESTS,
      data: null,
    },
  });

export function emailSettingsRoutes(
  controller: EmailSettingsController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();
  router.use(authMiddleware, authorize(Permission.SETTINGS_MANAGE));

  router.get('/', controller.get);
  router.put('/', controller.update);
  router.post('/test', testLimiter(), controller.test);
  router.delete('/', controller.disable);

  return router;
}
