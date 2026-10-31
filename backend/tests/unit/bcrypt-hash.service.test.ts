import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import { BcryptHashService } from '../../src/infrastructure/services/bcrypt-hash.service.ts';

describe('BcryptHashService', () => {
  const service = new BcryptHashService();

  it('hashes with cost 12', async () => {
    const hash = await service.hash('correct-horse-battery');
    expect(bcrypt.getRounds(hash)).toBe(12);
    expect(await service.compare('correct-horse-battery', hash)).toBe(true);
  });

  it('asks for a rehash of hashes made with a lower cost', async () => {
    const old = await bcrypt.hash('correct-horse-battery', 10);
    expect(service.needsRehash(old)).toBe(true);
    expect(service.needsRehash(await service.hash('correct-horse-battery'))).toBe(false);
  });

  it('treats something that is not a bcrypt hash as needing a rehash', () => {
    expect(service.needsRehash('not-a-hash')).toBe(true);
  });
});
