const TYPES = {
  // Use Cases
  RegisterSuperAdminUseCase: Symbol.for("RegisterSuperAdminUseCase"),
  SendOtpUseCase: Symbol.for("SendOtpUseCase"),
  GenericUseCase: Symbol.for("GenericUseCase"),

  // Repositories
  UserRepository: Symbol.for("UserRepository"),
    GenreRepository: Symbol.for("GenreRepository"),

  // Services
  CacheService: Symbol.for("CacheService"),
  EmailService: Symbol.for("EmailService"),
  HashService: Symbol.for("HashService"),
  OtpService: Symbol.for("OtpService"),

  // Controllers
  AdminController: Symbol.for("AdminController"),
  AuthController: Symbol.for("AuthController"),
    GenreController: Symbol.for("GenreController"),

  // External / Config
  DataSource: Symbol.for("DataSource"),
  RedisClient: Symbol.for("RedisClient"),
  Transporter: Symbol.for("Transporter"),
  SenderEmail: Symbol.for("SenderEmail"),
};

export default TYPES;
