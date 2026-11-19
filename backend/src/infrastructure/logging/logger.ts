import {
  destination,
  multistream,
  pino,
  stdSerializers,
  transport,
  type Logger,
  type LoggerOptions,
} from 'pino';
import { env } from '../../config/env.config.ts';
import type { ILogger, LogFields } from '../../application/interfaces/services/logger.interface.ts';
import { LokiStream } from './loki-stream.ts';

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

const level = env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info');

const prettyTransport = {
  target: 'pino-pretty',
  options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' },
};

// Set when LOKI_URL is: every line then also goes to Loki, labelled with these two values.
const lokiStream =
  env.LOKI_URL && level !== 'silent'
    ? new LokiStream({
        url: env.LOKI_URL,
        labels: { service: 'siemple-backend', environment: env.NODE_ENV },
      })
    : undefined;

const buildRootLogger = (): Logger => {
  if (!lokiStream) {
    return pino({
      ...baseLoggerOptions,
      level,
      ...(env.NODE_ENV === 'development' && { transport: prettyTransport }),
    });
  }
  // The console keeps exactly the output it has without Loki.
  const consoleStream =
    env.NODE_ENV === 'development' ? transport(prettyTransport) : destination(1);
  return pino(
    { ...baseLoggerOptions, level },
    multistream([
      { level, stream: consoleStream },
      { level, stream: lokiStream },
    ]),
  );
};

export const rootLogger: Logger = buildRootLogger();

/** Sends the lines still waiting for Loki. Called on shutdown; gives up after timeoutMs. */
export const flushLogs = async (timeoutMs = 3000): Promise<void> => {
  if (!lokiStream) return;
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    lokiStream.flush(),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    }),
  ]);
  clearTimeout(timer);
};

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
