import { container } from './container.js';
import TYPES from '../../domain/constants/types.js';

// Repositories
import { TypeOrmuUserRepository } from '../database/repositories/user.repositories.js';
import { AppDataSource } from '../database/data-source.js';

// Services
import { BcryptHashService } from '../services/bycrpt-hash.service.js';
import { OtpCryptoService } from '../services/otp.Crypto.service.js';
import { createRedisClient } from '../redis/redis.client.js';
import { RedisCacheService } from '../redis/redis-cache.service.js';
import { createTransporter } from '../../config/mailer.js';
import { env } from '../../config/env.js';
import { EmailService } from '../services/email.service.js';

// UseCases
import { RegisterSuperAdminUseCase } from '../../application/use-cases/admin/create-super-admin.usecase.js';
import { SendOtpUseCase } from '../../application/use-cases/auth/send-otp.usecase.js';

// Controllers
import { AdminController } from '../../presentation/controllers/admin.controller.js';
import { AuthController } from '../../presentation/controllers/auth.controller.js';

// 1. Bind external constants/factories
container.bind(TYPES.DataSource).toConstantValue(AppDataSource);

const redisClient = createRedisClient();
container.bind(TYPES.RedisClient).toConstantValue(redisClient);

const mailTransporter = createTransporter();
container.bind(TYPES.Transporter).toConstantValue(mailTransporter);
container.bind(TYPES.SenderEmail).toConstantValue(env.OTP_EMAIL);

// 2. Bind Repositories
container.bind(TYPES.UserRepository).to(TypeOrmuUserRepository);

// 3. Bind Services
container.bind(TYPES.HashService).to(BcryptHashService);
container.bind(TYPES.OtpService).to(OtpCryptoService);
container.bind(TYPES.CacheService).to(RedisCacheService);
container.bind(TYPES.EmailService).to(EmailService);

// 4. Bind UseCases
container.bind(TYPES.RegisterSuperAdminUseCase).to(RegisterSuperAdminUseCase);
container.bind(TYPES.SendOtpUseCase).to(SendOtpUseCase);

// 5. Bind Controllers
container.bind(TYPES.AdminController).to(AdminController);
container.bind(TYPES.AuthController).to(AuthController);

// Resolve the controllers
export const adminController = container.get<AdminController>(TYPES.AdminController);
export const authController = container.get<AuthController>(TYPES.AuthController);

export const di = {
  adminController,
  authController,
  container
};
