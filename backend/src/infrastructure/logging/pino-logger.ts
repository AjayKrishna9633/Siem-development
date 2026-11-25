import { pino, stdSerializers, type Logger, type LoggerOptions } from 'pino';
import type { ILogger, LogFields } from '../../application/interfaces/services/logger.interface.ts';

// No env.config import here: the enrollment service builds its logger from its own config.

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
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: { level: (label) => ({ level: label }) },
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  serializers: { err: stdSerializers.err },
};

export interface IRootLoggerOptions {
  service: string;
  level: string;
  pretty: boolean;
}

export const createRootLogger = ({ service, level, pretty }: IRootLoggerOptions): Logger =>
  pino({
    ...baseLoggerOptions,
    base: { service },
    level,
    ...(pretty && {
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
  constructor(private readonly _logger: Logger) {}

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
