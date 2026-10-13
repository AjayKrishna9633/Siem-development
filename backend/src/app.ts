import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppDataSource } from './infrastructure/database/data-source.ts';
import { di } from './infrastructure/di/index.ts';
import { adminRoutes } from './presentation/routes/admin.routes.ts';
import { authRoutes } from './presentation/routes/auth.routes.ts';
import { errorHandler } from './presentation/middlewares/errorHandler.ts';

const app = express();
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (_req, res) => {
  try {
    await AppDataSource.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

app.use('/api/admin', adminRoutes(di.adminController));
app.use('/api/auth', authRoutes(di.authController));

app.use(errorHandler);

export default app;
