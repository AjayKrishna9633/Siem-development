import type { IEncryptedSecret } from '../../../domain/types/email-settings.types.ts';

// Encrypts secrets stored in the database. `aad` names the field, so a ciphertext copied into
// another field fails to decrypt.
export interface ISecretCipher {
  readonly available: boolean;
  encrypt(plaintext: string, aad: string): IEncryptedSecret;
  decrypt(secret: IEncryptedSecret, aad: string): string;
}
