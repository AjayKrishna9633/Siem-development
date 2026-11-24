import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AesGcmSecretCipher,
  isEncryptionKey,
} from '../../src/infrastructure/services/aes-gcm-secret-cipher.service.ts';
import { SMTP_PASSWORD_AAD } from '../../src/domain/constants/email.ts';
import { AppError } from '../../src/domain/errors/AppError.ts';
import { AppErrorCode } from '../../src/domain/enums/AppErrorCode.ts';
import type { IEncryptedSecret } from '../../src/domain/types/email-settings.types.ts';

const KEY = randomBytes(32).toString('base64');
const OTHER_KEY = randomBytes(32).toString('base64');
const PASSWORD = 'abcd efgh ijkl mnop';

const cipher = new AesGcmSecretCipher(KEY);

const expectCode = (fn: () => unknown, code: AppErrorCode) => {
  let caught: unknown;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(AppError);
  expect((caught as AppError).code).toBe(code);
};

// Flips one bit of a base64 field.
const flip = (b64: string): string => {
  const bytes = Buffer.from(b64, 'base64');
  bytes[0] = (bytes[0] ?? 0) ^ 0x01;
  return bytes.toString('base64');
};

describe('AesGcmSecretCipher', () => {
  it('round-trips a password, and the stored form contains no part of it', () => {
    const secret = cipher.encrypt(PASSWORD, SMTP_PASSWORD_AAD);
    expect(JSON.stringify(secret)).not.toContain(PASSWORD);
    expect(JSON.stringify(secret)).not.toContain(Buffer.from(PASSWORD).toString('base64'));
    expect(cipher.decrypt(secret, SMTP_PASSWORD_AAD)).toBe(PASSWORD);
  });

  it('uses a fresh IV every time, so the same password encrypts differently', () => {
    const a = cipher.encrypt(PASSWORD, SMTP_PASSWORD_AAD);
    const b = cipher.encrypt(PASSWORD, SMTP_PASSWORD_AAD);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(Buffer.from(a.iv, 'base64')).toHaveLength(12);
    expect(Buffer.from(a.authTag, 'base64')).toHaveLength(16);
  });

  it('fails with the wrong key', () => {
    const secret = cipher.encrypt(PASSWORD, SMTP_PASSWORD_AAD);
    expectCode(
      () => new AesGcmSecretCipher(OTHER_KEY).decrypt(secret, SMTP_PASSWORD_AAD),
      AppErrorCode.STORED_SECRET_UNREADABLE,
    );
  });

  it.each<[string, (s: IEncryptedSecret) => IEncryptedSecret]>([
    ['ciphertext', (s) => ({ ...s, ciphertext: flip(s.ciphertext) })],
    ['auth tag', (s) => ({ ...s, authTag: flip(s.authTag) })],
    ['IV', (s) => ({ ...s, iv: flip(s.iv) })],
  ])('fails when the %s is tampered with', (_field, tamper) => {
    const secret = cipher.encrypt(PASSWORD, SMTP_PASSWORD_AAD);
    expectCode(
      () => cipher.decrypt(tamper(secret), SMTP_PASSWORD_AAD),
      AppErrorCode.STORED_SECRET_UNREADABLE,
    );
  });

  it('fails with the wrong AAD, so a ciphertext copied into another field is useless', () => {
    const secret = cipher.encrypt(PASSWORD, SMTP_PASSWORD_AAD);
    expectCode(() => cipher.decrypt(secret, 'other-field'), AppErrorCode.STORED_SECRET_UNREADABLE);
  });

  it('refuses a key version it does not know', () => {
    const secret = cipher.encrypt(PASSWORD, SMTP_PASSWORD_AAD);
    expectCode(
      () => cipher.decrypt({ ...secret, keyVersion: 2 }, SMTP_PASSWORD_AAD),
      AppErrorCode.STORED_SECRET_UNREADABLE,
    );
  });

  it('is unavailable without a key, and says so instead of crashing', () => {
    const none = new AesGcmSecretCipher(undefined);
    expect(none.available).toBe(false);
    expectCode(
      () => none.encrypt(PASSWORD, SMTP_PASSWORD_AAD),
      AppErrorCode.ENCRYPTION_KEY_NOT_CONFIGURED,
    );
    expect(cipher.available).toBe(true);
  });

  it('rejects a malformed key at construction', () => {
    expect(() => new AesGcmSecretCipher('too-short')).toThrow(/32 bytes of base64/);
  });
});

describe('isEncryptionKey', () => {
  it('accepts what openssl rand -base64 32 prints', () => {
    expect(isEncryptionKey(KEY)).toBe(true);
    expect(KEY).toHaveLength(44);
  });

  it.each([
    ['16 bytes', randomBytes(16).toString('base64')],
    ['33 bytes', randomBytes(33).toString('base64')],
    ['hex', randomBytes(32).toString('hex')],
    ['spaces', `${KEY.slice(0, 20)} ${KEY.slice(21)}`],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(isEncryptionKey(value)).toBe(false);
  });
});
