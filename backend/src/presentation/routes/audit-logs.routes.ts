import { Router, type RequestHandler } from 'express';
import type { AuditLogsController } from '../controllers/audit-logs.controller.ts';
import { authorize } from '../middlewares/auth.middleware.ts';
import { createRateLimiter } from '../http/rate-limit.ts';
import { Permission } from '../../domain/enums/Permission.ts';

export function auditLogsRoutes(
  controller: AuditLogsController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();
  router.use(authMiddleware, authorize(Permission.AUDIT_VIEW));

  // An export reads up to 100k rows, so it gets a tighter limit than browsing does.
  const exportLimiter = createRateLimiter(
    10,
    'Too many audit exports, please try again later.',
    15,
  );

  router.get('/', controller.list);
  // Must stay above /:id, or "export" would be read as an id.
  router.get('/export', exportLimiter, controller.export);
  router.get('/:id', controller.get);

  return router;
}
