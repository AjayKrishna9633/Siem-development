import { Router } from 'express';
import type { HealthController } from '../controllers/health.controller.ts';

export function healthRoutes(controller: HealthController): Router {
  const router = Router();

  router.get('/', controller.check);

  return router;
}
