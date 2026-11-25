import type { Logger } from 'pino';
import { env } from '../../config/env.config.ts';
import type { ILogger } from '../../application/interfaces/services/logger.interface.ts';
import { createRootLogger, PinoLogger } from './pino-logger.ts';

export { baseLoggerOptions, PinoLogger } from './pino-logger.ts';

export const rootLogger: Logger = createRootLogger({
  service: 'siemple-backend',
  level: env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info'),
  pretty: env.NODE_ENV === 'development',
});

export const logger: ILogger = new PinoLogger(rootLogger);
