import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { DataSource } from 'typeorm';
import type { ILogger } from '../application/interfaces/services/logger.interface.ts';

// Agents reach this service directly on its own port, never through the web proxy, so
// 'trust proxy' stays off: req.ip is the real peer address.
export const createEnrollApp = (db: DataSource, logger: ILogger): Express => {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '4kb' }));

  app.get('/enroll/health', async (_req: Request, res: Response) => {
    try {
      await db.query('SELECT 1');
      res.status(200).json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', { err });
    res.status(500).json({ message: 'Something went wrong' });
  });

  return app;
};
