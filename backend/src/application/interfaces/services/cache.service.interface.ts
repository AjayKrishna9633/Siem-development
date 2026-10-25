export interface ICacheService {
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  // Atomic "claim": stores the value only if the key does not exist yet. Exactly one of
  // several simultaneous callers gets true, so it can guard one-time actions.
  setIfAbsent<T>(key: string, value: T, ttl: number): Promise<boolean>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
}
export type CacheKey =
  | `reset-token:${string}`
  | `refresh:${string}`
  | `refresh-used:${string}`
  | `refresh-family:${string}`
  | `activation:${string}`
  | `activation-user:${string}`
  | `verify:${string}:${string}`;
