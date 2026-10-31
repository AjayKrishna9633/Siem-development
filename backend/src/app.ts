import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppDataSource } from './infrastructure/database/data-source.ts';
import { env } from './config/env.config.ts';
import { di } from './infrastructure/di/index.ts';
import { sessionRoutes } from './presentation/routes/session.routes.ts';
import { passwordResetRoutes } from './presentation/routes/password-reset.routes.ts';
import { accountRoutes } from './presentation/routes/account.routes.ts';
import { activationRoutes } from './presentation/routes/activation.routes.ts';
import { teamRoutes } from './presentation/routes/team.routes.ts';
import { errorHandler, notFoundHandler } from './presentation/middlewares/errorHandler.ts';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/health', async (_req, res) => {
  try {
    await AppDataSource.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

// Auth endpoints share one prefix but are split by concern
app.use('/api/auth', sessionRoutes(di.sessionController));
app.use('/api/auth', passwordResetRoutes(di.passwordResetController));
app.use('/api/auth', accountRoutes(di.accountController, di.authMiddleware));
app.use('/api/auth', activationRoutes(di.activationController));
app.use('/api/team', teamRoutes(di.teamController, di.authMiddleware));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
