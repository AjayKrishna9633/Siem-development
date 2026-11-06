export interface IRedisClient {
  set(
    key: string,
    value: string,
    mode: 'EX' | 'PX' | 'EXAT' | 'PXAT' | 'KEEPTTL',
    duration: number,
  ): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    duration: number,
    condition: 'NX',
  ): Promise<'OK' | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
}
