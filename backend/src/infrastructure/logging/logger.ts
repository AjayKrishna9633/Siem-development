import { pino, stdSerializers, type Logger, type LoggerOptions } from 'pino';
import { env } from '../../config/env.config.ts';
import type { ILogger, LogFields } from '../../application/interfaces/services/logger.interface.ts';

// A second line of defence: these fields are masked wherever they show up in a log
// entry, so a careless `logger.info('...', { password })` still can't leak one.
// Request bodies are never logged at all (see http-logger.ts).
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

// Everything except level and output, shared with the tests that check redaction
export const baseLoggerOptions: LoggerOptions = {
  base: { service: 'siemple-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  serializers: { err: stdSerializers.err },
};

// JSON lines in production so operators can feed them to their own log tooling;
// readable coloured lines while developing. pino-pretty is a dev dependency, which is
// why it is only loaded in development.
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

// Adapts pino to the application's ILogger, so use cases never depend on pino itself.
// The message comes first, unlike pino's own (fields, message) order.
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
