const TYPES = {
  // Use Cases
  RegisterSuperAdminUseCase: Symbol.for('RegisterSuperAdminUseCase'),
  SendOtpUseCase: Symbol.for('SendOtpUseCase'),
  VerifyOtpUseCase: Symbol.for('VerifyOtpUseCase'),
  LoginUseCase: Symbol.for('LoginUseCase'),
  GetCurrentUserUseCase: Symbol.for('GetCurrentUserUseCase'),
  ResetPasswordUseCase: Symbol.for('ResetPasswordUseCase'),
  UpdateProfileUseCase: Symbol.for('UpdateProfileUseCase'),
  CreateCompanyUseCase: Symbol.for('CreateCompanyUseCase'),
  ListCompaniesUseCase: Symbol.for('ListCompaniesUseCase'),
  UpdateCompanyUseCase: Symbol.for('UpdateCompanyUseCase'),
  SetCompanyStatusUseCase: Symbol.for('SetCompanyStatusUseCase'),
  ReplaceCompanyAdminUseCase: Symbol.for('ReplaceCompanyAdminUseCase'),
  AddTeamMemberUseCase: Symbol.for('AddTeamMemberUseCase'),
  ListTeamMembersUseCase: Symbol.for('ListTeamMembersUseCase'),
  GetActivationUseCase: Symbol.for('GetActivationUseCase'),
  ActivateAccountUseCase: Symbol.for('ActivateAccountUseCase'),
  ResendActivationUseCase: Symbol.for('ResendActivationUseCase'),
  RefreshSessionUseCase: Symbol.for('RefreshSessionUseCase'),
  LogoutUseCase: Symbol.for('LogoutUseCase'),
  // Repositories & Mappers
  UserRepository: Symbol.for('UserRepository'),
  UserMapper: Symbol.for('UserMapper'),
  CompanyRepository: Symbol.for('CompanyRepository'),
  CompanyMapper: Symbol.for('CompanyMapper'),

  // Services
  CacheService: Symbol.for('CacheService'),
  EmailService: Symbol.for('EmailService'),
  HashService: Symbol.for('HashService'),
  OtpService: Symbol.for('OtpService'),
  TokenService: Symbol.for('TokenService'),
  SessionService: Symbol.for('SessionService'),
  ActivationService: Symbol.for('ActivationService'),

  // Middleware
  AuthMiddleware: Symbol.for('AuthMiddleware'),

  // Controllers
  AdminController: Symbol.for('AdminController'),
  AuthController: Symbol.for('AuthController'),
  CompanyController: Symbol.for('CompanyController'),
  TeamController: Symbol.for('TeamController'),

  // External / Config
  DataSource: Symbol.for('DataSource'),
  RedisClient: Symbol.for('RedisClient'),
  Transporter: Symbol.for('Transporter'),
  SenderEmail: Symbol.for('SenderEmail'),
};

export default TYPES;
