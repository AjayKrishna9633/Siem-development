import { container } from './container.ts';
import TYPES from '../../domain/constants/types.ts';

// Repositories & Mappers
import { TypeOrmUserRepository } from '../database/repositories/user.repository.ts';
import { UserMapper } from '../database/mappers/user.mapper.ts';
import { AppDataSource } from '../database/data-source.ts';

// Services
import { BcryptHashService } from '../services/bcrypt-hash.service.ts';
import { createRedisClient } from '../redis/redis.client.ts';
import { RedisCacheService } from '../redis/redis-cache.service.ts';
import { createTransporter } from '../../config/mailer.ts';
import { env } from '../../config/env.config.ts';
import { EmailService } from '../services/email.service.ts';
import { JwtTokenService } from '../services/jwt-token.service.ts';
import { RefreshSessionService } from '../services/refresh-session.service.ts';
import { VerificationCodeService } from '../services/verification-code.service.ts';
import { SecurityMailer } from '../services/security-mailer.service.ts';
import { RequestPasswordChangeUseCase } from '../../application/use-cases/account/request-password-change.usecase.ts';
import { ChangePasswordUseCase } from '../../application/use-cases/account/change-password.usecase.ts';
import { RequestEmailChangeUseCase } from '../../application/use-cases/account/request-email-change.usecase.ts';
import { ChangeEmailUseCase } from '../../application/use-cases/account/change-email.usecase.ts';
import { ActivationService } from '../services/activation.service.ts';

// UseCases
import { SendOtpUseCase } from '../../application/use-cases/auth/send-otp.usecase.ts';
import { VerifyOtpUseCase } from '../../application/use-cases/auth/verify-otp.usecase.ts';
import { LoginUseCase } from '../../application/use-cases/auth/login.usecase.ts';
import { GetCurrentUserUseCase } from '../../application/use-cases/auth/get-current-user.usecase.ts';
import { ResetPasswordUseCase } from '../../application/use-cases/auth/reset-password.usecase.ts';
import { UpdateProfileUseCase } from '../../application/use-cases/auth/update-profile.usecase.ts';
import { AddTeamMemberUseCase } from '../../application/use-cases/team/add-team-member.usecase.ts';
import { ListTeamMembersUseCase } from '../../application/use-cases/team/list-team-members.usecase.ts';
import { GetActivationUseCase } from '../../application/use-cases/activation/get-activation.usecase.ts';
import { VerifyActivationUseCase } from '../../application/use-cases/activation/verify-activation.usecase.ts';
import { ActivateAccountUseCase } from '../../application/use-cases/activation/activate-account.usecase.ts';
import { ResendActivationUseCase } from '../../application/use-cases/activation/resend-activation.usecase.ts';
import { RefreshSessionUseCase } from '../../application/use-cases/auth/refresh-session.usecase.ts';
import { LogoutUseCase } from '../../application/use-cases/auth/logout.usecase.ts';
import type { ITokenService } from '../../application/interfaces/services/token.service.interface.ts';
import { authenticate } from '../../presentation/middlewares/auth.middleware.ts';

// Controllers
import { SessionController } from '../../presentation/controllers/session.controller.ts';
import { PasswordResetController } from '../../presentation/controllers/password-reset.controller.ts';
import { AccountController } from '../../presentation/controllers/account.controller.ts';
import { ActivationController } from '../../presentation/controllers/activation.controller.ts';
import { TeamController } from '../../presentation/controllers/team.controller.ts';

// 1. Bind external constants/factories
container.bind(TYPES.DataSource).toConstantValue(AppDataSource);

const redisClient = createRedisClient();
container.bind(TYPES.RedisClient).toConstantValue(redisClient);

const mailTransporter = createTransporter();
container.bind(TYPES.Transporter).toConstantValue(mailTransporter);
container.bind(TYPES.SenderEmail).toConstantValue(env.OTP_EMAIL);

// 2. Bind Repositories & Mappers
container.bind(TYPES.UserMapper).to(UserMapper);
container.bind(TYPES.UserRepository).to(TypeOrmUserRepository);

// 3. Bind Services
container.bind(TYPES.HashService).to(BcryptHashService);
container.bind(TYPES.CacheService).to(RedisCacheService);
container.bind(TYPES.EmailService).to(EmailService);
container.bind(TYPES.TokenService).to(JwtTokenService);
container.bind(TYPES.SessionService).to(RefreshSessionService);
container.bind(TYPES.ActivationService).to(ActivationService);
container.bind(TYPES.VerificationCodeService).to(VerificationCodeService);
container.bind(TYPES.SecurityMailer).to(SecurityMailer);

// 4. Bind UseCases
container.bind(TYPES.SendOtpUseCase).to(SendOtpUseCase);
container.bind(TYPES.VerifyOtpUseCase).to(VerifyOtpUseCase);
container.bind(TYPES.LoginUseCase).to(LoginUseCase);
container.bind(TYPES.GetCurrentUserUseCase).to(GetCurrentUserUseCase);
container.bind(TYPES.ResetPasswordUseCase).to(ResetPasswordUseCase);
container.bind(TYPES.UpdateProfileUseCase).to(UpdateProfileUseCase);
container.bind(TYPES.AddTeamMemberUseCase).to(AddTeamMemberUseCase);
container.bind(TYPES.ListTeamMembersUseCase).to(ListTeamMembersUseCase);
container.bind(TYPES.GetActivationUseCase).to(GetActivationUseCase);
container.bind(TYPES.VerifyActivationUseCase).to(VerifyActivationUseCase);
container.bind(TYPES.ActivateAccountUseCase).to(ActivateAccountUseCase);
container.bind(TYPES.ResendActivationUseCase).to(ResendActivationUseCase);
container.bind(TYPES.RefreshSessionUseCase).to(RefreshSessionUseCase);
container.bind(TYPES.LogoutUseCase).to(LogoutUseCase);
container.bind(TYPES.RequestPasswordChangeUseCase).to(RequestPasswordChangeUseCase);
container.bind(TYPES.ChangePasswordUseCase).to(ChangePasswordUseCase);
container.bind(TYPES.RequestEmailChangeUseCase).to(RequestEmailChangeUseCase);
container.bind(TYPES.ChangeEmailUseCase).to(ChangeEmailUseCase);

// 5. Bind Controllers
container.bind(TYPES.SessionController).to(SessionController);
container.bind(TYPES.PasswordResetController).to(PasswordResetController);
container.bind(TYPES.AccountController).to(AccountController);
container.bind(TYPES.ActivationController).to(ActivationController);
container.bind(TYPES.TeamController).to(TeamController);

// Resolve the controllers & services
export const sessionController = container.get<SessionController>(TYPES.SessionController);
export const passwordResetController = container.get<PasswordResetController>(
  TYPES.PasswordResetController,
);
export const accountController = container.get<AccountController>(TYPES.AccountController);
export const activationController = container.get<ActivationController>(TYPES.ActivationController);
export const teamController = container.get<TeamController>(TYPES.TeamController);
export const tokenService = container.get<ITokenService>(TYPES.TokenService);
export const authMiddleware = authenticate(tokenService);

export { redisClient };

export const di = {
  sessionController,
  passwordResetController,
  accountController,
  activationController,
  teamController,
  authMiddleware,
  tokenService,
  redisClient,
  container,
};
