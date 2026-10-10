export interface ICacheService{
    set<T>(key:string , value:T , ttl:number):Promise<void>;
    get<T>(key:string):Promise<T|null>
    delete(key:string):Promise<void>;
}
export type CacheKey =
  | `otp:signup:${string}`
  | `otp:reset:${string}`
  | `rl:login:${string}`;