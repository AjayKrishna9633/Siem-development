import 'dotenv/config';
// Inversify's decorators need it even when a test builds one class by hand
import 'reflect-metadata';

// Runs before any test file imports the app. Integration tests point the app at
// TEST_DATABASE_URL; the app's own config then reads DATABASE_URL as usual.
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

// Tests must never send real email. Blanking these (dotenv doesn't override variables
// that are already set) makes the app run without email, so invite and reset links come
// back in API responses, which is also what the tests read.
for (const name of ['SMTP_HOST', 'OTP_EMAIL', 'OTP_PASSWORD']) process.env[name] = '';
