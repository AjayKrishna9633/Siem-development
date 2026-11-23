import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { ISecretCipher } from '../../application/interfaces/services/secret-cipher.service.interface.ts';
import type { IEncryptedSecret } from '../../domain/types/email-settings.types.ts';
import { SETTINGS_KEY_VERSION } from '../../domain/constants/email.ts';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// What `openssl rand -base64 32` prints: standard base64 of exactly 32 bytes.
export const isEncryptionKey = (value: string): boolean =>
  BASE64.test(value) && Buffer.from(value, 'base64').length === KEY_BYTES;

// AES-256-GCM: a fresh random IV per encryption, and the auth tag rejects any change to the
// ciphertext, the IV or the AAD.
export class AesGcmSecretCipher implements ISecretCipher {
  private readonly _key: Buffer | null;

  constructor(keyBase64: string | undefined) {
    if (keyBase64 !== undefined && !isEncryptionKey(keyBase64)) {
      throw new Error(
        'SETTINGS_ENCRYPTION_KEY must be 32 bytes of base64 (openssl rand -base64 32)',
      );
    }
    this._key = keyBase64 ? Buffer.from(keyBase64, 'base64') : null;
  }

  get available(): boolean {
    return this._key !== null;
  }

  encrypt(plaintext: string, aad: string): IEncryptedSecret {
    const key = this.requireKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
    cipher.setAAD(Buffer.from(aad, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      keyVersion: SETTINGS_KEY_VERSION,
    };
  }

  decrypt(secret: IEncryptedSecret, aad: string): string {
    const key = this.requireKey();
    if (secret.keyVersion !== SETTINGS_KEY_VERSION) throw unreadable();
    try {
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(secret.iv, 'base64'), {
        authTagLength: TAG_BYTES,
      });
      decipher.setAAD(Buffer.from(aad, 'utf8'));
      decipher.setAuthTag(Buffer.from(secret.authTag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(secret.ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw unreadable();
    }
  }

  private requireKey(): Buffer {
    if (!this._key) {
      throw new AppError(
        AppErrorCode.ENCRYPTION_KEY_NOT_CONFIGURED,
        ErrorMessage.ENCRYPTION_KEY_NOT_CONFIGURED,
      );
    }
    return this._key;
  }
}

const unreadable = () =>
  new AppError(AppErrorCode.STORED_SECRET_UNREADABLE, ErrorMessage.STORED_SECRET_UNREADABLE);
