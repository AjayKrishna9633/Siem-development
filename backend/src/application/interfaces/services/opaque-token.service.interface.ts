// Random secrets handed to a person once (setup token; later invite and reset links).
// Only the hash is ever stored, so a database dump yields nothing usable.
export interface IOpaqueToken {
  token: string;
  hash: string;
}

export interface IOpaqueTokenService {
  generate(): IOpaqueToken;
  hash(token: string): string;
  // Constant-time, so response timing reveals nothing about how close a guess was
  matches(token: string, expectedHash: string): boolean;
}
