import { container } from './container.ts';
import TYPES from '../../domain/constants/types.ts';

import { TypeOrmUserRepository } from '../database/repositories/user.repository.ts';
import { UserMapper } from '../database/mappers/user.mapper.ts';
import { TypeOrmAuditLogRepository } from '../database/repositories/audit-log.repository.ts';
import { TypeOrmSystemSettingsRepository } from '../database/repositories/system-settings.repository.ts';
import { SystemSettingsMapper } from '../database/mappers/system-settings.mapper.ts';
import { TypeOrmAuthTokenRepository } from '../database/repositories/auth-token.repository.ts';
import { TypeOrmEmailSettingsRepository } from '../database/repositories/email-settings.repository.ts';
import { AesGcmSecretCipher } from '../services/aes-gcm-secret-cipher.service.ts';
import { AppDataSource } from '../database/data-source.ts';

import { BcryptHashService } from '../services/bcrypt-hash.service.ts';
import { createRedisClient } from '../redis/redis.client.ts';
import { logger } from '../logging/logger.ts';
import { RedisCacheService } from '../redis/redis-cache.service.ts';
import { MailTransportProvider } from '../services/mail-transport.provider.ts';
import type { IMailTransportProvider } from '../../application/interfaces/services/mail-transport.provider.interface.ts';
import type { IEmailSettingsRepository } from '../../application/interfaces/repositories/email-settings.repository.interface.ts';
import type { ISecretCipher } from '../../application/interfaces/services/secret-cipher.service.interface.ts';
import { EmailService } from '../services/email.service.ts';
import { JwtTokenService } from '../services/jwt-token.service.ts';
import { RefreshSessionService } from '../services/refresh-session.service.ts';
import { VerificationCodeService } from '../services/verification-code.service.ts';
import { SecurityMailer } from '../services/security-mailer.service.ts';
import { ChangePasswordUseCase } from '../../application/use-cases/account/change-password.usecase.ts';
import { RequestEmailChangeUseCase } from '../../application/use-cases/account/request-email-change.usecase.ts';
import { ChangeEmailUseCase } from '../../application/use-cases/account/change-email.usecase.ts';
import { AuthTokenService } from '../services/auth-token.service.ts';
import { AuthMailer } from '../services/auth-mailer.service.ts';
import { OpaqueTokenService } from '../services/opaque-token.service.ts';
import { AuditService } from '../services/audit.service.ts';
import { AsyncRequestContext } from '../context/async-request-context.ts';
import type { IAuditService } from '../../application/interfaces/services/audit.service.interface.ts';
import type { IRequestContextProvider } from '../../application/interfaces/services/request-context.provider.interface.ts';

import { RequestPasswordResetUseCase } from '../../application/use-cases/password-reset/request-password-reset.usecase.ts';
import { GetPasswordResetUseCase } from '../../application/use-cases/password-reset/get-password-reset.usecase.ts';
import { IssueResetLinkUseCase } from '../../application/use-cases/password-reset/issue-reset-link.usecase.ts';
import { CreateRecoveryLinkUseCase } from '../../application/use-cases/password-reset/create-recovery-link.usecase.ts';
import type { ICreateRecoveryLinkUseCase } from '../../application/interfaces/use-cases/password-reset.interface.ts';
import { LoginUseCase } from '../../application/use-cases/auth/login.usecase.ts';
import { GetCurrentUserUseCase } from '../../application/use-cases/auth/get-current-user.usecase.ts';
import { ResetPasswordUseCase } from '../../application/use-cases/password-reset/reset-password.usecase.ts';
import { UpdateProfileUseCase } from '../../application/use-cases/auth/update-profile.usecase.ts';
import { ListUsersUseCase } from '../../application/use-cases/users/list-users.usecase.ts';
import { ChangeUserRoleUseCase } from '../../application/use-cases/users/change-user-role.usecase.ts';
import { SetUserStatusUseCase } from '../../application/use-cases/users/set-user-status.usecase.ts';
import { InviteUserUseCase } from '../../application/use-cases/invites/invite-user.usecase.ts';
import { ResendInviteUseCase } from '../../application/use-cases/invites/resend-invite.usecase.ts';
import { RevokeInviteUseCase } from '../../application/use-cases/invites/revoke-invite.usecase.ts';
import { ListPendingInvitesUseCase } from '../../application/use-cases/invites/list-pending-invites.usecase.ts';
import { GetInviteUseCase } from '../../application/use-cases/invites/get-invite.usecase.ts';
import { AcceptInviteUseCase } from '../../application/use-cases/invites/accept-invite.usecase.ts';
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

import { SessionController } from '../../presentation/controllers/session.controller.ts';
import { PasswordResetController } from '../../presentation/controllers/password-reset.controller.ts';
import { AccountController } from '../../presentation/controllers/account.controller.ts';
import { InviteController } from '../../presentation/controllers/invite.controller.ts';
import { UsersController } from '../../presentation/controllers/users.controller.ts';
import { SetupController } from '../../presentation/controllers/setup.controller.ts';
import { AuditLogsController } from '../../presentation/controllers/audit-logs.controller.ts';
import { ListAuditLogsUseCase } from '../../application/use-cases/audit/list-audit-logs.usecase.ts';
import { GetAuditLogUseCase } from '../../application/use-cases/audit/get-audit-log.usecase.ts';
import { ExportAuditLogsUseCase } from '../../application/use-cases/audit/export-audit-logs.usecase.ts';
import { SmtpEmailTester } from '../services/smtp-email-tester.service.ts';
import { GetEmailSettingsUseCase } from '../../application/use-cases/email-settings/get-email-settings.usecase.ts';
import { UpdateEmailSettingsUseCase } from '../../application/use-cases/email-settings/update-email-settings.usecase.ts';
import { TestEmailSettingsUseCase } from '../../application/use-cases/email-settings/test-email-settings.usecase.ts';
import { DisableEmailSettingsUseCase } from '../../application/use-cases/email-settings/disable-email-settings.usecase.ts';
import { EmailSettingsController } from '../../presentation/controllers/email-settings.controller.ts';
import type { IEnvSmtpConfig } from '../../application/types/use-case/email-settings.types.ts';
import { HealthCheckService } from '../services/health-check.service.ts';
import { HealthController } from '../../presentation/controllers/health.controller.ts';
import { env } from '../../config/env.config.ts';

container.bind(TYPES.DataSource).toConstantValue(AppDataSource);
container.bind(TYPES.Logger).toConstantValue(logger);

const redisClient = createRedisClient(logger.child({ module: 'redis' }));
container.bind(TYPES.RedisClient).toConstantValue(redisClient);

container.bind(TYPES.HealthCheckService).toConstantValue(
  new HealthCheckService({
    pingDatabase: () => AppDataSource.query('SELECT 1'),
    redis: redisClient,
    redisRequired: env.NODE_ENV === 'production',
    logger,
  }),
);

container.bind(TYPES.UserMapper).to(UserMapper);
container.bind(TYPES.UserRepository).to(TypeOrmUserRepository);
container.bind(TYPES.AuditLogRepository).to(TypeOrmAuditLogRepository);
container.bind(TYPES.SystemSettingsMapper).to(SystemSettingsMapper);
container.bind(TYPES.SystemSettingsRepository).to(TypeOrmSystemSettingsRepository);
container.bind(TYPES.AuthTokenRepository).to(TypeOrmAuthTokenRepository);
container.bind(TYPES.EmailSettingsRepository).to(TypeOrmEmailSettingsRepository);
container
  .bind(TYPES.SecretCipher)
  .toConstantValue(new AesGcmSecretCipher(env.SETTINGS_ENCRYPTION_KEY));
const envSmtp: IEnvSmtpConfig | null = env.SMTP_HOST
  ? {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.SMTP_FROM,
    }
  : null;
container.bind(TYPES.EnvSmtpConfig).toConstantValue(envSmtp);
export const mailTransports: IMailTransportProvider = new MailTransportProvider(
  envSmtp,
  container.get<IEmailSettingsRepository>(TYPES.EmailSettingsRepository),
  container.get<ISecretCipher>(TYPES.SecretCipher),
  logger,
);
container.bind(TYPES.MailTransportProvider).toConstantValue(mailTransports);

container.bind(TYPES.HashService).to(BcryptHashService);
container.bind(TYPES.CacheService).to(RedisCacheService);
container.bind(TYPES.EmailService).to(EmailService);
container.bind(TYPES.TokenService).to(JwtTokenService);
container.bind(TYPES.SessionService).to(RefreshSessionService);
container.bind(TYPES.AuthTokenService).to(AuthTokenService);
container.bind(TYPES.AuthMailer).to(AuthMailer);
container.bind(TYPES.VerificationCodeService).to(VerificationCodeService);
container.bind(TYPES.SecurityMailer).to(SecurityMailer);
container.bind(TYPES.OpaqueTokenService).to(OpaqueTokenService);
container.bind(TYPES.RequestContextProvider).to(AsyncRequestContext);
container.bind(TYPES.AuditService).to(AuditService);

container.bind(TYPES.RequestPasswordResetUseCase).to(RequestPasswordResetUseCase);
container.bind(TYPES.GetPasswordResetUseCase).to(GetPasswordResetUseCase);
container.bind(TYPES.IssueResetLinkUseCase).to(IssueResetLinkUseCase);
container.bind(TYPES.CreateRecoveryLinkUseCase).to(CreateRecoveryLinkUseCase);
container.bind(TYPES.LoginUseCase).to(LoginUseCase);
container.bind(TYPES.GetCurrentUserUseCase).to(GetCurrentUserUseCase);
container.bind(TYPES.ResetPasswordUseCase).to(ResetPasswordUseCase);
container.bind(TYPES.UpdateProfileUseCase).to(UpdateProfileUseCase);
container.bind(TYPES.ListUsersUseCase).to(ListUsersUseCase);
container.bind(TYPES.ChangeUserRoleUseCase).to(ChangeUserRoleUseCase);
container.bind(TYPES.SetUserStatusUseCase).to(SetUserStatusUseCase);
container.bind(TYPES.InviteUserUseCase).to(InviteUserUseCase);
container.bind(TYPES.ResendInviteUseCase).to(ResendInviteUseCase);
container.bind(TYPES.RevokeInviteUseCase).to(RevokeInviteUseCase);
container.bind(TYPES.ListPendingInvitesUseCase).to(ListPendingInvitesUseCase);
container.bind(TYPES.GetInviteUseCase).to(GetInviteUseCase);
container.bind(TYPES.AcceptInviteUseCase).to(AcceptInviteUseCase);
container.bind(TYPES.RefreshSessionUseCase).to(RefreshSessionUseCase);
container.bind(TYPES.LogoutUseCase).to(LogoutUseCase);
container.bind(TYPES.ResolveSessionUserUseCase).to(ResolveSessionUserUseCase);
container.bind(TYPES.ChangePasswordUseCase).to(ChangePasswordUseCase);
container.bind(TYPES.RequestEmailChangeUseCase).to(RequestEmailChangeUseCase);
container.bind(TYPES.ChangeEmailUseCase).to(ChangeEmailUseCase);
container.bind(TYPES.IssueSetupTokenUseCase).to(IssueSetupTokenUseCase);
container.bind(TYPES.GetSetupStatusUseCase).to(GetSetupStatusUseCase);
container.bind(TYPES.VerifySetupTokenUseCase).to(VerifySetupTokenUseCase);
container.bind(TYPES.CompleteSetupUseCase).to(CompleteSetupUseCase);
container.bind(TYPES.ListAuditLogsUseCase).to(ListAuditLogsUseCase);
container.bind(TYPES.GetAuditLogUseCase).to(GetAuditLogUseCase);
container.bind(TYPES.ExportAuditLogsUseCase).to(ExportAuditLogsUseCase);
container.bind(TYPES.EmailTester).to(SmtpEmailTester);
container.bind(TYPES.GetEmailSettingsUseCase).to(GetEmailSettingsUseCase);
container.bind(TYPES.UpdateEmailSettingsUseCase).to(UpdateEmailSettingsUseCase);
container.bind(TYPES.TestEmailSettingsUseCase).to(TestEmailSettingsUseCase);
container.bind(TYPES.DisableEmailSettingsUseCase).to(DisableEmailSettingsUseCase);

container.bind(TYPES.SessionController).to(SessionController);
container.bind(TYPES.PasswordResetController).to(PasswordResetController);
container.bind(TYPES.AccountController).to(AccountController);
container.bind(TYPES.InviteController).to(InviteController);
container.bind(TYPES.UsersController).to(UsersController);
container.bind(TYPES.SetupController).to(SetupController);
container.bind(TYPES.AuditLogsController).to(AuditLogsController);
container.bind(TYPES.EmailSettingsController).to(EmailSettingsController);
container.bind(TYPES.HealthController).to(HealthController);

export const sessionController = container.get<SessionController>(TYPES.SessionController);
export const passwordResetController = container.get<PasswordResetController>(
  TYPES.PasswordResetController,
);
export const accountController = container.get<AccountController>(TYPES.AccountController);
export const inviteController = container.get<InviteController>(TYPES.InviteController);
export const usersController = container.get<UsersController>(TYPES.UsersController);
export const auditLogsController = container.get<AuditLogsController>(TYPES.AuditLogsController);
export const emailSettingsController = container.get<EmailSettingsController>(
  TYPES.EmailSettingsController,
);
export const healthController = container.get<HealthController>(TYPES.HealthController);
export const tokenService = container.get<ITokenService>(TYPES.TokenService);
export const auditService = container.get<IAuditService>(TYPES.AuditService);
export const requestContextProvider = container.get<IRequestContextProvider>(
  TYPES.RequestContextProvider,
);
export const authMiddleware = authenticate(
  tokenService,
  container.get<IResolveSessionUserUseCase>(TYPES.ResolveSessionUserUseCase),
  requestContextProvider,
);
export const createRecoveryLink = container.get<ICreateRecoveryLinkUseCase>(
  TYPES.CreateRecoveryLinkUseCase,
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
  inviteController,
  usersController,
  auditLogsController,
  emailSettingsController,
  healthController,
  setupController,
  authMiddleware,
  auditService,
  requestContextProvider,
  setupGuardMiddleware,
  issueSetupToken,
  createRecoveryLink,
  tokenService,
  redisClient,
  container,
};
