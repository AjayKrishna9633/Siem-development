import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppDataSource } from './infrastructure/database/data-source.ts';
import { appOrigin, env } from './config/env.config.ts';
import { httpLogger } from './infrastructure/logging/http-logger.ts';
import { di } from './infrastructure/di/index.ts';
import { sessionRoutes } from './presentation/routes/session.routes.ts';
import { passwordResetRoutes } from './presentation/routes/password-reset.routes.ts';
import { accountRoutes } from './presentation/routes/account.routes.ts';
import { inviteRoutes } from './presentation/routes/invite.routes.ts';
import { usersRoutes } from './presentation/routes/users.routes.ts';
import { auditLogsRoutes } from './presentation/routes/audit-logs.routes.ts';
import { setupRoutes } from './presentation/routes/setup.routes.ts';
import { healthRoutes } from './presentation/routes/health.routes.ts';
import { agentsRoutes } from './presentation/routes/agents.routes.ts';
import { auditAccessDenied } from './presentation/middlewares/access-denied-audit.middleware.ts';
import { requestContextMiddleware } from './presentation/middlewares/request-context.middleware.ts';
import { errorHandler, notFoundHandler } from './presentation/middlewares/errorHandler.ts';

const app = express();
if (env.TRUST_PROXY !== undefined) app.set('trust proxy', env.TRUST_PROXY);
app.use(httpLogger);
app.use(helmet());
app.use(cors({ origin: appOrigin, credentials: true }));
app.use(di.setupGuardMiddleware);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(requestContextMiddleware(di.requestContextProvider));

app.get('/health', async (_req, res) => {
  try {
    await AppDataSource.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

app.use('/api/health', healthRoutes(di.healthController));
app.use('/api/setup', setupRoutes(di.setupController));
app.use('/api/auth', sessionRoutes(di.sessionController));
app.use('/api/auth', passwordResetRoutes(di.passwordResetController));
app.use('/api/auth', accountRoutes(di.accountController, di.authMiddleware));
app.use('/api/auth', inviteRoutes(di.inviteController));
app.use('/api/users', usersRoutes(di.usersController, di.authMiddleware));
app.use('/api/audit-logs', auditLogsRoutes(di.auditLogsController, di.authMiddleware));
app.use('/api/agents', agentsRoutes(di.agentsController, di.authMiddleware));

app.use(notFoundHandler);
app.use(auditAccessDenied(di.auditService));
app.use(errorHandler);

export default app;
