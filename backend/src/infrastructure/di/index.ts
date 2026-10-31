import { container } from './container.ts';
import TYPES from '../../domain/constants/types.ts';

// Repositories & Mappers
import { TypeOrmUserRepository } from '../database/repositories/user.repository.ts';
import { UserMapper } from '../database/mappers/user.mapper.ts';
import { TypeOrmAuditLogRepository } from '../database/repositories/audit-log.repository.ts';
import { TypeOrmSystemSettingsRepository } from '../database/repositories/system-settings.repository.ts';
import { SystemSettingsMapper } from '../database/mappers/system-settings.mapper.ts';
import { AppDataSource } from '../database/data-source.ts';

// Services
import { BcryptHashService } from '../services/bcrypt-hash.service.ts';
import { createRedisClient } from '../redis/redis.client.ts';
import { RedisCacheService } from '../redis/redis-cache.service.ts';
import { createMailTransport } from '../../config/mailer.ts';
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
import { OpaqueTokenService } from '../services/opaque-token.service.ts';

// UseCases
import { SendOtpUseCase } from '../../application/use-cases/auth/send-otp.usecase.ts';
import { VerifyOtpUseCase } from '../../application/use-cases/auth/verify-otp.usecase.ts';
import { LoginUseCase } from '../../application/use-cases/auth/login.usecase.ts';
import { GetCurrentUserUseCase } from '../../application/use-cases/auth/get-current-user.usecase.ts';
import { ResetPasswordUseCase } from '../../application/use-cases/auth/reset-password.usecase.ts';
import { UpdateProfileUseCase } from '../../application/use-cases/auth/update-profile.usecase.ts';
import { AddUserUseCase } from '../../application/use-cases/users/add-user.usecase.ts';
import { ListUsersUseCase } from '../../application/use-cases/users/list-users.usecase.ts';
import { ChangeUserRoleUseCase } from '../../application/use-cases/users/change-user-role.usecase.ts';
import { SetUserStatusUseCase } from '../../application/use-cases/users/set-user-status.usecase.ts';
import { GetActivationUseCase } from '../../application/use-cases/activation/get-activation.usecase.ts';
import { VerifyActivationUseCase } from '../../application/use-cases/activation/verify-activation.usecase.ts';
import { ActivateAccountUseCase } from '../../application/use-cases/activation/activate-account.usecase.ts';
import { ResendActivationUseCase } from '../../application/use-cases/activation/resend-activation.usecase.ts';
import { RefreshSessionUseCase } from '../../application/use-cases/auth/refresh-session.usecase.ts';
import { LogoutUseCase } from '../../application/use-cases/auth/logout.usecase.ts';
import { ResolveSessionUserUseCase } from '../../application/use-cases/auth/resolve-session-user.usecase.ts';
import type { IResolveSessionUserUseCase } from '../../application/interfaces/use-cases/resolve-session-user.interface.ts';
import { IssueSetupTokenUseCase } from '../../application/use-cases/setup/issue-setup-token.usecase.ts';
import { GetSetupStatusUseCase } from '../../application/use-cases/setup/get-setup-status.usecase.ts';
import { VerifySetupTokenUseCase } from '../../application/use-cases/setup/verify-setup-token.usecase.ts';
import { CompleteSetupUseCase } from '../../application/use-cases/setup/complete-setup.usecase.ts';
import type {
  IGetSetupStatusUseCase,
  IIssueSetupTokenUseCase,
} from '../../application/interfaces/use-cases/setup.interface.ts';
import { setupGuard } from '../../presentation/middlewares/setup-guard.middleware.ts';
import type { ITokenService } from '../../application/interfaces/services/token.service.interface.ts';
import { authenticate } from '../../presentation/middlewares/auth.middleware.ts';

// Controllers
import { SessionController } from '../../presentation/controllers/session.controller.ts';
import { PasswordResetController } from '../../presentation/controllers/password-reset.controller.ts';
import { AccountController } from '../../presentation/controllers/account.controller.ts';
import { ActivationController } from '../../presentation/controllers/activation.controller.ts';
import { UsersController } from '../../presentation/controllers/users.controller.ts';
import { SetupController } from '../../presentation/controllers/setup.controller.ts';

// 1. Bind external constants/factories
container.bind(TYPES.DataSource).toConstantValue(AppDataSource);

const redisClient = createRedisClient();
container.bind(TYPES.RedisClient).toConstantValue(redisClient);

// Null when email isn't configured; EmailService then reports nothing as delivered
const mailTransport = createMailTransport();
container.bind(TYPES.MailTransport).toConstantValue(mailTransport);
export const emailConfigured = mailTransport !== null;

// 2. Bind Repositories & Mappers
container.bind(TYPES.UserMapper).to(UserMapper);
container.bind(TYPES.UserRepository).to(TypeOrmUserRepository);
container.bind(TYPES.AuditLogRepository).to(TypeOrmAuditLogRepository);
container.bind(TYPES.SystemSettingsMapper).to(SystemSettingsMapper);
container.bind(TYPES.SystemSettingsRepository).to(TypeOrmSystemSettingsRepository);

// 3. Bind Services
container.bind(TYPES.HashService).to(BcryptHashService);
container.bind(TYPES.CacheService).to(RedisCacheService);
container.bind(TYPES.EmailService).to(EmailService);
container.bind(TYPES.TokenService).to(JwtTokenService);
container.bind(TYPES.SessionService).to(RefreshSessionService);
container.bind(TYPES.ActivationService).to(ActivationService);
container.bind(TYPES.VerificationCodeService).to(VerificationCodeService);
container.bind(TYPES.SecurityMailer).to(SecurityMailer);
container.bind(TYPES.OpaqueTokenService).to(OpaqueTokenService);

// 4. Bind UseCases
container.bind(TYPES.SendOtpUseCase).to(SendOtpUseCase);
container.bind(TYPES.VerifyOtpUseCase).to(VerifyOtpUseCase);
container.bind(TYPES.LoginUseCase).to(LoginUseCase);
container.bind(TYPES.GetCurrentUserUseCase).to(GetCurrentUserUseCase);
container.bind(TYPES.ResetPasswordUseCase).to(ResetPasswordUseCase);
container.bind(TYPES.UpdateProfileUseCase).to(UpdateProfileUseCase);
container.bind(TYPES.AddUserUseCase).to(AddUserUseCase);
container.bind(TYPES.ListUsersUseCase).to(ListUsersUseCase);
container.bind(TYPES.ChangeUserRoleUseCase).to(ChangeUserRoleUseCase);
container.bind(TYPES.SetUserStatusUseCase).to(SetUserStatusUseCase);
container.bind(TYPES.GetActivationUseCase).to(GetActivationUseCase);
container.bind(TYPES.VerifyActivationUseCase).to(VerifyActivationUseCase);
container.bind(TYPES.ActivateAccountUseCase).to(ActivateAccountUseCase);
container.bind(TYPES.ResendActivationUseCase).to(ResendActivationUseCase);
container.bind(TYPES.RefreshSessionUseCase).to(RefreshSessionUseCase);
container.bind(TYPES.LogoutUseCase).to(LogoutUseCase);
container.bind(TYPES.ResolveSessionUserUseCase).to(ResolveSessionUserUseCase);
container.bind(TYPES.RequestPasswordChangeUseCase).to(RequestPasswordChangeUseCase);
container.bind(TYPES.ChangePasswordUseCase).to(ChangePasswordUseCase);
container.bind(TYPES.RequestEmailChangeUseCase).to(RequestEmailChangeUseCase);
container.bind(TYPES.ChangeEmailUseCase).to(ChangeEmailUseCase);
container.bind(TYPES.IssueSetupTokenUseCase).to(IssueSetupTokenUseCase);
container.bind(TYPES.GetSetupStatusUseCase).to(GetSetupStatusUseCase);
container.bind(TYPES.VerifySetupTokenUseCase).to(VerifySetupTokenUseCase);
container.bind(TYPES.CompleteSetupUseCase).to(CompleteSetupUseCase);

// 5. Bind Controllers
container.bind(TYPES.SessionController).to(SessionController);
container.bind(TYPES.PasswordResetController).to(PasswordResetController);
container.bind(TYPES.AccountController).to(AccountController);
container.bind(TYPES.ActivationController).to(ActivationController);
container.bind(TYPES.UsersController).to(UsersController);
container.bind(TYPES.SetupController).to(SetupController);

// Resolve the controllers & services
export const sessionController = container.get<SessionController>(TYPES.SessionController);
export const passwordResetController = container.get<PasswordResetController>(
  TYPES.PasswordResetController,
);
export const accountController = container.get<AccountController>(TYPES.AccountController);
export const activationController = container.get<ActivationController>(TYPES.ActivationController);
export const usersController = container.get<UsersController>(TYPES.UsersController);
export const tokenService = container.get<ITokenService>(TYPES.TokenService);
export const authMiddleware = authenticate(
  tokenService,
  container.get<IResolveSessionUserUseCase>(TYPES.ResolveSessionUserUseCase),
);
export const setupController = container.get<SetupController>(TYPES.SetupController);
export const issueSetupToken = container.get<IIssueSetupTokenUseCase>(TYPES.IssueSetupTokenUseCase);
const getSetupStatus = container.get<IGetSetupStatusUseCase>(TYPES.GetSetupStatusUseCase);
export const setupGuardMiddleware = setupGuard(
  async () => (await getSetupStatus.execute()).completed,
);

export { redisClient };

export const di = {
  sessionController,
  passwordResetController,
  accountController,
  activationController,
  usersController,
  setupController,
  authMiddleware,
  setupGuardMiddleware,
  issueSetupToken,
  tokenService,
  redisClient,
  container,
};
