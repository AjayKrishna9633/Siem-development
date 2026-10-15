import { container } from './container.ts';
import TYPES from '../../domain/constants/types.ts';

// Repositories & Mappers
import { TypeOrmuUserRepository } from '../database/repositories/user.repositories.ts';
import { UserMapper } from '../database/mappers/user.mapper.ts';
import { AppDataSource } from '../database/data-source.ts';

// Services
import { BcryptHashService } from '../services/bycrpt-hash.service.ts';
import { OtpCryptoService } from '../services/otp.Crypto.service.ts';
import { createRedisClient } from '../redis/redis.client.ts';
import { RedisCacheService } from '../redis/redis-cache.service.ts';
import { createTransporter } from '../../config/mailer.ts';
import { env } from '../../config/env.config.ts';
import { EmailService } from '../services/email.service.ts';
import { JwtTokenService } from '../services/jwt-token.service.ts';

// UseCases
import { RegisterSuperAdminUseCase } from '../../application/use-cases/admin/create-super-admin.usecase.ts';
import { SendOtpUseCase } from '../../application/use-cases/auth/send-otp.usecase.ts';
import { VerifyOtpUseCase } from '../../application/use-cases/auth/verify-otp.usecase.ts';
import { LoginUseCase } from '../../application/use-cases/auth/login.usecase.ts';
import { GetCurrentUserUseCase } from '../../application/use-cases/auth/get-current-user.usecase.ts';
import type { ITokenService } from '../../application/interfaces/services/token.service.interface.ts';
import { authenticate } from '../../presentation/middlewares/auth.middleware.ts';

// Controllers
import { AdminController } from '../../presentation/controllers/admin.controller.ts';
import { AuthController } from '../../presentation/controllers/auth.controller.ts';

// 1. Bind external constants/factories
container.bind(TYPES.DataSource).toConstantValue(AppDataSource);

const redisClient = createRedisClient();
container.bind(TYPES.RedisClient).toConstantValue(redisClient);

const mailTransporter = createTransporter();
container.bind(TYPES.Transporter).toConstantValue(mailTransporter);
container.bind(TYPES.SenderEmail).toConstantValue(env.OTP_EMAIL);

// 2. Bind Repositories & Mappers
container.bind(TYPES.UserMapper).to(UserMapper);
container.bind(TYPES.UserRepository).to(TypeOrmuUserRepository);

// 3. Bind Services
container.bind(TYPES.HashService).to(BcryptHashService);
container.bind(TYPES.OtpService).to(OtpCryptoService);
container.bind(TYPES.CacheService).to(RedisCacheService);
container.bind(TYPES.EmailService).to(EmailService);
container.bind(TYPES.TokenService).to(JwtTokenService);

// 4. Bind UseCases
container.bind(TYPES.RegisterSuperAdminUseCase).to(RegisterSuperAdminUseCase);
container.bind(TYPES.SendOtpUseCase).to(SendOtpUseCase);
container.bind(TYPES.VerifyOtpUseCase).to(VerifyOtpUseCase);
container.bind(TYPES.LoginUseCase).to(LoginUseCase);
container.bind(TYPES.GetCurrentUserUseCase).to(GetCurrentUserUseCase);

// 5. Bind Controllers
container.bind(TYPES.AdminController).to(AdminController);
container.bind(TYPES.AuthController).to(AuthController);

// Resolve the controllers & services
export const adminController = container.get<AdminController>(TYPES.AdminController);
export const authController = container.get<AuthController>(TYPES.AuthController);
export const tokenService = container.get<ITokenService>(TYPES.TokenService);
export const authMiddleware = authenticate(tokenService);

export { redisClient };

export const di = {
  adminController,
  authController,
  authMiddleware,
  tokenService,
  redisClient,
  container,
};
