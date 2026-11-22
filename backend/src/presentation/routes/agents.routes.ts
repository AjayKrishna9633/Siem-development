import { Router, type RequestHandler } from 'express';
import type { AgentsController } from '../controllers/agents.controller.ts';
import { authorize } from '../middlewares/auth.middleware.ts';
import { createUserRateLimiter } from '../http/rate-limit.ts';
import { Permission } from '../../domain/enums/Permission.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

export function agentsRoutes(controller: AgentsController, authMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authMiddleware);

  const checkLimiter = createUserRateLimiter(1, 3, ErrorMessage.TOO_MANY_ENROLLMENT_CHECKS);

  router.get('/groups', authorize(Permission.AGENTS_MANAGE), controller.groups);
  router.post('/enroll-command', authorize(Permission.AGENTS_MANAGE), controller.enrollCommand);
  router.get(
    '/enrollment-check',
    authorize(Permission.AGENTS_MANAGE),
    checkLimiter,
    controller.enrollmentCheck,
  );

  return router;
}
