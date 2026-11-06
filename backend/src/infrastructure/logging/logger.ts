import { pino, stdSerializers, type Logger, type LoggerOptions } from 'pino';
import { env } from '../../config/env.config.ts';
import type { ILogger, LogFields } from '../../application/interfaces/services/logger.interface.ts';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'accessToken',
  'setupToken',
  'link',
  '*.password',
  '*.currentPassword',
  '*.newPassword',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  '*.setupToken',
  '*.link',
];

export const baseLoggerOptions: LoggerOptions = {
  base: { service: 'siemple-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  serializers: { err: stdSerializers.err },
};

export const rootLogger: Logger = pino({
  ...baseLoggerOptions,
  level: env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info'),
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' },
    },
  }),
});

export class PinoLogger implements ILogger {
  constructor(private readonly logger: Logger = rootLogger) {}

  debug(message: string, fields?: LogFields): void {
    this.logger.debug(fields ?? {}, message);
  }

  info(message: string, fields?: LogFields): void {
    this.logger.info(fields ?? {}, message);
  }

  warn(message: string, fields?: LogFields): void {
    this.logger.warn(fields ?? {}, message);
  }

  error(message: string, fields?: LogFields): void {
    this.logger.error(fields ?? {}, message);
  }

  child(bindings: LogFields): ILogger {
    return new PinoLogger(this.logger.child(bindings));
  }
}

export const logger: ILogger = new PinoLogger();
