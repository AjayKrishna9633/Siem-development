const TYPES = {
  // Use Cases
  RequestPasswordResetUseCase: Symbol.for('RequestPasswordResetUseCase'),
  GetPasswordResetUseCase: Symbol.for('GetPasswordResetUseCase'),
  IssueResetLinkUseCase: Symbol.for('IssueResetLinkUseCase'),
  CreateRecoveryLinkUseCase: Symbol.for('CreateRecoveryLinkUseCase'),
  LoginUseCase: Symbol.for('LoginUseCase'),
  GetCurrentUserUseCase: Symbol.for('GetCurrentUserUseCase'),
  ResetPasswordUseCase: Symbol.for('ResetPasswordUseCase'),
  UpdateProfileUseCase: Symbol.for('UpdateProfileUseCase'),
  ListUsersUseCase: Symbol.for('ListUsersUseCase'),
  ChangeUserRoleUseCase: Symbol.for('ChangeUserRoleUseCase'),
  InviteUserUseCase: Symbol.for('InviteUserUseCase'),
  ResendInviteUseCase: Symbol.for('ResendInviteUseCase'),
  RevokeInviteUseCase: Symbol.for('RevokeInviteUseCase'),
  ListPendingInvitesUseCase: Symbol.for('ListPendingInvitesUseCase'),
  GetInviteUseCase: Symbol.for('GetInviteUseCase'),
  AcceptInviteUseCase: Symbol.for('AcceptInviteUseCase'),
  SetUserStatusUseCase: Symbol.for('SetUserStatusUseCase'),
  RefreshSessionUseCase: Symbol.for('RefreshSessionUseCase'),
  LogoutUseCase: Symbol.for('LogoutUseCase'),
  ResolveSessionUserUseCase: Symbol.for('ResolveSessionUserUseCase'),
  RequestPasswordChangeUseCase: Symbol.for('RequestPasswordChangeUseCase'),
  ChangePasswordUseCase: Symbol.for('ChangePasswordUseCase'),
  RequestEmailChangeUseCase: Symbol.for('RequestEmailChangeUseCase'),
  ChangeEmailUseCase: Symbol.for('ChangeEmailUseCase'),
  IssueSetupTokenUseCase: Symbol.for('IssueSetupTokenUseCase'),
  GetSetupStatusUseCase: Symbol.for('GetSetupStatusUseCase'),
  VerifySetupTokenUseCase: Symbol.for('VerifySetupTokenUseCase'),
  CompleteSetupUseCase: Symbol.for('CompleteSetupUseCase'),
  // Repositories & Mappers
  UserRepository: Symbol.for('UserRepository'),
  UserMapper: Symbol.for('UserMapper'),
  AuditLogRepository: Symbol.for('AuditLogRepository'),
  SystemSettingsRepository: Symbol.for('SystemSettingsRepository'),
  SystemSettingsMapper: Symbol.for('SystemSettingsMapper'),
  AuthTokenRepository: Symbol.for('AuthTokenRepository'),

  // Services
  CacheService: Symbol.for('CacheService'),
  EmailService: Symbol.for('EmailService'),
  HashService: Symbol.for('HashService'),
  TokenService: Symbol.for('TokenService'),
  SessionService: Symbol.for('SessionService'),
  AuthTokenService: Symbol.for('AuthTokenService'),
  AuthMailer: Symbol.for('AuthMailer'),
  VerificationCodeService: Symbol.for('VerificationCodeService'),
  SecurityMailer: Symbol.for('SecurityMailer'),
  OpaqueTokenService: Symbol.for('OpaqueTokenService'),

  // Middleware
  AuthMiddleware: Symbol.for('AuthMiddleware'),

  // Controllers
  SessionController: Symbol.for('SessionController'),
  PasswordResetController: Symbol.for('PasswordResetController'),
  AccountController: Symbol.for('AccountController'),
  InviteController: Symbol.for('InviteController'),
  UsersController: Symbol.for('UsersController'),
  SetupController: Symbol.for('SetupController'),

  // External / Config
  DataSource: Symbol.for('DataSource'),
  RedisClient: Symbol.for('RedisClient'),
  MailTransport: Symbol.for('MailTransport'),
};

export default TYPES;
