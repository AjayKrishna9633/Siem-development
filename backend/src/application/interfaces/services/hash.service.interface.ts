export interface IHashService {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
  // True when `hash` was made with a weaker setting than today's (e.g. a lower bcrypt
  // cost), so it should be replaced the next time the plain password is available
  needsRehash(hash: string): boolean;
}
