import { injectable } from 'inversify';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type {
  IOpaqueToken,
  IOpaqueTokenService,
} from '../../application/interfaces/services/opaque-token.service.interface.ts';

// 32 bytes = 256 bits: far beyond guessing, so a fast hash (SHA-256) is enough —
// unlike passwords, which are short and need a slow hash like bcrypt
const TOKEN_BYTES = 32;

@injectable()
export class OpaqueTokenService implements IOpaqueTokenService {
  generate(): IOpaqueToken {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  matches(token: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hash(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    // timingSafeEqual throws on unequal lengths; a stored hash is always 32 bytes
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
