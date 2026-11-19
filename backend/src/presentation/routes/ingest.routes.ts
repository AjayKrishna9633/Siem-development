import express, { Router, type Request, type RequestHandler, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { IngestController } from '../controllers/ingest.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { ingestEventsSchema } from '../validators/ingest.schema.ts';
import { INGEST_LIMITS } from '../../domain/constants/ingest.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';

const tooMany = (message: string) => ({
  success: false,
  statusCode: HttpStatusCode.TOO_MANY_REQUESTS,
  message,
  data: null,
});

// Mounted before the app-wide JSON parser (100 KB): ingest batches get their own, larger limit,
// and the body is only parsed once the key has been checked.
export function ingestRoutes(controller: IngestController, keyAuth: RequestHandler): Router {
  const router = Router();

  // Per address, counting only refused requests (bad key, bad body), to slow down guessing.
  // Log storage being down (5xx) is not the sender's fault and doesn't count.
  const failureLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: INGEST_LIMITS.FAILURES_PER_15_MIN,
    requestWasSuccessful: (_req: Request, res: Response) =>
      res.statusCode < 400 || res.statusCode >= 500,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: tooMany(ErrorMessage.TOO_MANY_INGEST_FAILURES),
  });

  // Per key, so one chatty sender can't crowd out the others.
  const keyLimiter = rateLimit({
    windowMs: 60_000,
    limit: INGEST_LIMITS.REQUESTS_PER_MINUTE,
    keyGenerator: (req: Request) => req.ingestKey?.id ?? 'unauthenticated',
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: tooMany(ErrorMessage.TOO_MANY_INGEST_REQUESTS),
  });

  router.post(
    '/',
    failureLimiter,
    keyAuth,
    keyLimiter,
    express.json({ limit: INGEST_LIMITS.BODY_LIMIT }),
    validate(ingestEventsSchema),
    controller.ingest,
  );

  return router;
}
