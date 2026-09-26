import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppDataSource } from './infrasturcture/database/data-source.js';
import { TypeOrmuUserRepository } from './infrasturcture/database/repositories/user.repositories.js';
import { BcryptHashService } from './infrasturcture/service/bycrpt-hash.service.js';
import { RegisterSuperAdminUseCase } from './application/use-case/admin/create-super-admin.usecase.js';
import { AdminController } from './presentation/controllers/admin.controller.js';
import { adminRoutes } from './presentation/routes/admin.routes.js';
import { errorHandler } from './presentation/middleware/errorHandler.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

// Dependencies
const userRepo = new TypeOrmuUserRepository(AppDataSource);
const hasher = new BcryptHashService();
const registerSuperAdminUseCase = new RegisterSuperAdminUseCase(userRepo, hasher);
const adminController = new AdminController(registerSuperAdminUseCase);

app.get('/health', async (_req, res) => {
  try {
    await AppDataSource.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

app.use('/api/admin', adminRoutes(adminController));

app.use(errorHandler);

export default app;