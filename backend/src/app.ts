import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppDataSource } from './infrastructure/database/data-source.ts';
import { env } from './config/env.config.ts';
import { httpLogger } from './infrastructure/logging/http-logger.ts';
import { di } from './infrastructure/di/index.ts';
import { sessionRoutes } from './presentation/routes/session.routes.ts';
import { passwordResetRoutes } from './presentation/routes/password-reset.routes.ts';
import { accountRoutes } from './presentation/routes/account.routes.ts';
import { inviteRoutes } from './presentation/routes/invite.routes.ts';
import { usersRoutes } from './presentation/routes/users.routes.ts';
import { setupRoutes } from './presentation/routes/setup.routes.ts';
import { errorHandler, notFoundHandler } from './presentation/middlewares/errorHandler.ts';

const app = express();
// Without this behind a proxy, every request would appear to come from the proxy's IP
if (env.TRUST_PROXY !== undefined) app.set('trust proxy', env.TRUST_PROXY);
// First, so requests rejected by any later middleware are logged too
app.use(httpLogger);
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
// Before any API route: blocks the API until first-run setup is done, then closes setup
app.use(di.setupGuardMiddleware);
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

app.use('/api/setup', setupRoutes(di.setupController));
// Auth endpoints share one prefix but are split by concern
app.use('/api/auth', sessionRoutes(di.sessionController));
app.use('/api/auth', passwordResetRoutes(di.passwordResetController));
app.use('/api/auth', accountRoutes(di.accountController, di.authMiddleware));
app.use('/api/auth', inviteRoutes(di.inviteController));
app.use('/api/users', usersRoutes(di.usersController, di.authMiddleware));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
