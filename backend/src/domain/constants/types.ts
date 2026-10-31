const TYPES = {
  // Use Cases
  SendOtpUseCase: Symbol.for('SendOtpUseCase'),
  VerifyOtpUseCase: Symbol.for('VerifyOtpUseCase'),
  LoginUseCase: Symbol.for('LoginUseCase'),
  GetCurrentUserUseCase: Symbol.for('GetCurrentUserUseCase'),
  ResetPasswordUseCase: Symbol.for('ResetPasswordUseCase'),
  UpdateProfileUseCase: Symbol.for('UpdateProfileUseCase'),
  AddUserUseCase: Symbol.for('AddUserUseCase'),
  ListUsersUseCase: Symbol.for('ListUsersUseCase'),
  ChangeUserRoleUseCase: Symbol.for('ChangeUserRoleUseCase'),
  SetUserStatusUseCase: Symbol.for('SetUserStatusUseCase'),
  GetActivationUseCase: Symbol.for('GetActivationUseCase'),
  VerifyActivationUseCase: Symbol.for('VerifyActivationUseCase'),
  ActivateAccountUseCase: Symbol.for('ActivateAccountUseCase'),
  ResendActivationUseCase: Symbol.for('ResendActivationUseCase'),
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

  // Services
  CacheService: Symbol.for('CacheService'),
  EmailService: Symbol.for('EmailService'),
  HashService: Symbol.for('HashService'),
  TokenService: Symbol.for('TokenService'),
  SessionService: Symbol.for('SessionService'),
  ActivationService: Symbol.for('ActivationService'),
  VerificationCodeService: Symbol.for('VerificationCodeService'),
  SecurityMailer: Symbol.for('SecurityMailer'),
  OpaqueTokenService: Symbol.for('OpaqueTokenService'),

  // Middleware
  AuthMiddleware: Symbol.for('AuthMiddleware'),

  // Controllers
  SessionController: Symbol.for('SessionController'),
  PasswordResetController: Symbol.for('PasswordResetController'),
  AccountController: Symbol.for('AccountController'),
  ActivationController: Symbol.for('ActivationController'),
  UsersController: Symbol.for('UsersController'),
  SetupController: Symbol.for('SetupController'),

  // External / Config
  DataSource: Symbol.for('DataSource'),
  RedisClient: Symbol.for('RedisClient'),
  Transporter: Symbol.for('Transporter'),
  SenderEmail: Symbol.for('SenderEmail'),
};

export default TYPES;
