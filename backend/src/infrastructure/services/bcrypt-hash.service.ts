import { injectable } from 'inversify';
import bcrypt from 'bcrypt';
import type { IHashService } from '../../application/interfaces/services/hash.service.interface.ts';
import { BCRYPT_COST } from '../../domain/constants/security.ts';

@injectable()
export class BcryptHashService implements IHashService {
  constructor(private readonly saltRounds: number = BCRYPT_COST) {}

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  needsRehash(hash: string): boolean {
    try {
      return bcrypt.getRounds(hash) < this.saltRounds;
    } catch {
      return true;
    }
  }
}
