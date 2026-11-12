export interface IOpaqueToken {
  token: string;
  hash: string;
}

export interface IOpaqueTokenService {
  generate(): IOpaqueToken;
  hash(token: string): string;
  matches(token: string, expectedHash: string): boolean;
}
