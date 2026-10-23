export interface ICacheService {
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
}
export type CacheKey =
  | `otp:signup:${string}`
  | `otp:reset:${string}`
  | `reset-token:${string}`
  | `rl:login:${string}`
  | `invite:${string}`
  | `refresh:${string}`
  | `refresh-family:${string}`
  | `activation:${string}`
  | `activation-user:${string}`;
