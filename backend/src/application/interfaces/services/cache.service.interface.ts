export interface ICacheService {
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  setIfAbsent<T>(key: string, value: T, ttl: number): Promise<boolean>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
}
export type CacheKey =
  | `refresh:${string}`
  | `refresh-used:${string}`
  | `refresh-family:${string}`
  | `verify:${string}:${string}`;
