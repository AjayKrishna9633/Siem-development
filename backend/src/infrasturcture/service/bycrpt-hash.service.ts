import bcrypt from 'bcrypt';
import type { IHashService } from '../../application/interface/service/hash.service.interface.js';

export class BcryptHashService implements IHashService {
  constructor(private readonly saltRounds: number = 10) {}

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
