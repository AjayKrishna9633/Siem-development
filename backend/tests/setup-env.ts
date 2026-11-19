import 'dotenv/config';
import 'reflect-metadata';

const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl) {
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error(
      'TEST_DATABASE_URL must be a different database from DATABASE_URL: integration tests wipe it.',
    );
  }
  process.env.DATABASE_URL = testUrl;
}
process.env.NODE_ENV = 'test';

// LOKI_URL too: tests must never write to a real Loki. The ingest tests start their own fake.
for (const name of ['SMTP_HOST', 'OTP_EMAIL', 'OTP_PASSWORD', 'LOKI_URL']) {
  process.env[name] = '';
}
