import { injectable } from 'inversify';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type {
  IOpaqueToken,
  IOpaqueTokenService,
} from '../../application/interfaces/services/opaque-token.service.interface.ts';

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
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
