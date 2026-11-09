import type { IApiResponse } from '../IAPIResponse.ts';

export class ApiResponse<T = unknown> implements IApiResponse<T> {
  public readonly success: boolean;

  constructor(
    public readonly statusCode: number,
    public readonly data: T | null = null,
    public readonly message: string = 'Success',
    public readonly code?: string,
  ) {
    this.success = this.statusCode >= 200 && this.statusCode < 300;
  }
}
