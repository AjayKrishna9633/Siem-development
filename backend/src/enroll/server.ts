import 'dotenv/config';
import 'reflect-metadata';
import { parseEnrollConfig } from './config.ts';
import { createEnrollDataSource } from './data-source.ts';
import { createEnrollApp } from './app.ts';
import { connectWithRetry } from '../infrastructure/database/connect-with-retry.ts';
import { createRootLogger, PinoLogger } from '../infrastructure/logging/pino-logger.ts';

const result = parseEnrollConfig(process.env);
if (!result.ok) {
  // The config sets the log level, so this one message uses a plain logger.
  new PinoLogger(
    createRootLogger({ service: 'siemple-enroll', level: 'error', pretty: false }),
  ).error('Invalid environment variables', { errors: result.errors });
  process.exit(1);
}
const { config } = result;

const logger = new PinoLogger(
  createRootLogger({
    service: 'siemple-enroll',
    level: config.LOG_LEVEL ?? (config.NODE_ENV === 'test' ? 'silent' : 'info'),
    pretty: config.NODE_ENV === 'development',
  }),
);

const db = createEnrollDataSource(config.ENROLL_DATABASE_URL);
await connectWithRetry(() => db.initialize(), logger);
logger.info('Database connected');

const server = createEnrollApp(db, logger).listen(config.ENROLL_PORT, (err?: Error) => {
  if (err) {
    logger.error('Enrollment service failed to start', { port: config.ENROLL_PORT, err });
    process.exit(1);
  }
  logger.info('Enrollment service listening', { port: config.ENROLL_PORT });
});

let shuttingDown = false;
const shutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Shutting down', { signal });
  server.close(async () => {
    if (db.isInitialized) await db.destroy();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
