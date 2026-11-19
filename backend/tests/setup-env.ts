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

for (const name of ['SMTP_HOST', 'OTP_EMAIL', 'OTP_PASSWORD']) process.env[name] = '';
