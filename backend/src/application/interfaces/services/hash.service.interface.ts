export interface IHashService {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
  needsRehash(hash: string): boolean;
}
