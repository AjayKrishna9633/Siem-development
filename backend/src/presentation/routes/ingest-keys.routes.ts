import { Router, type RequestHandler } from 'express';
import type { IngestKeysController } from '../controllers/ingest-keys.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { authorize } from '../middlewares/auth.middleware.ts';
import { Permission } from '../../domain/enums/Permission.ts';
import { createIngestKeySchema } from '../validators/ingest.schema.ts';

export function ingestKeysRoutes(
  controller: IngestKeysController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();
  router.use(authMiddleware, authorize(Permission.INGEST_MANAGE));

  router.get('/', controller.list);
  router.post('/', validate(createIngestKeySchema), controller.create);
  router.delete('/:id', controller.revoke);

  return router;
}
