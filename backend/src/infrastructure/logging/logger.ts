import { pino, stdSerializers, type Logger, type LoggerOptions } from 'pino';
import { env } from '../../config/env.config.ts';
import type { ILogger, LogFields } from '../../application/interfaces/services/logger.interface.ts';

// Request bodies, headers and cookies are never logged on purpose; these paths catch them anyway
// if one is ever passed as a field, along with every secret-carrying field name.
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
  'authorization',
  'cookie',
  'body',
  '*.authorization',
  '*.cookie',
  '*.body',
  'headers.authorization',
  'headers.cookie',
];

export const baseLoggerOptions: LoggerOptions = {
  base: { service: 'siemple-backend' },
  // One JSON object per line on stdout. Alloy collects it from the container log and reads
  // `level` as a word ("warn"), so it can become a label; pino would otherwise write 40.
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: { level: (label) => ({ level: label }) },
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  serializers: { err: stdSerializers.err },
};

export const rootLogger: Logger = pino({
  ...baseLoggerOptions,
  level: env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info'),
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        timestampKey: 'timestamp',
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname,service',
      },
    },
  }),
});

export class PinoLogger implements ILogger {
  constructor(private readonly _logger: Logger = rootLogger) {}

  debug(message: string, fields?: LogFields): void {
    this._logger.debug(fields ?? {}, message);
  }

  info(message: string, fields?: LogFields): void {
    this._logger.info(fields ?? {}, message);
  }

  warn(message: string, fields?: LogFields): void {
    this._logger.warn(fields ?? {}, message);
  }

  error(message: string, fields?: LogFields): void {
    this._logger.error(fields ?? {}, message);
  }

  child(bindings: LogFields): ILogger {
    return new PinoLogger(this._logger.child(bindings));
  }
}

export const logger: ILogger = new PinoLogger();
