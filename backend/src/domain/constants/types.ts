const TYPES = {
  // Use Cases
  RegisterSuperAdminUseCase: Symbol.for('RegisterSuperAdminUseCase'),
  SendOtpUseCase: Symbol.for('SendOtpUseCase'),
  VerifyOtpUseCase: Symbol.for('VerifyOtpUseCase'),
  LoginUseCase: Symbol.for('LoginUseCase'),
  GetCurrentUserUseCase: Symbol.for('GetCurrentUserUseCase'),

  // Repositories & Mappers
  UserRepository: Symbol.for('UserRepository'),
  UserMapper: Symbol.for('UserMapper'),

  // Services
  CacheService: Symbol.for('CacheService'),
  EmailService: Symbol.for('EmailService'),
  HashService: Symbol.for('HashService'),
  OtpService: Symbol.for('OtpService'),
  TokenService: Symbol.for('TokenService'),

  // Middleware
  AuthMiddleware: Symbol.for('AuthMiddleware'),

  // Controllers
  AdminController: Symbol.for('AdminController'),
  AuthController: Symbol.for('AuthController'),

  // External / Config
  DataSource: Symbol.for('DataSource'),
  RedisClient: Symbol.for('RedisClient'),
  Transporter: Symbol.for('Transporter'),
  SenderEmail: Symbol.for('SenderEmail'),
};

export default TYPES;
