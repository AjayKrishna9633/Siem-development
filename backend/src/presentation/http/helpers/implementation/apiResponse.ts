import type { IApiResponse } from '../IAPIResponse.js';

export class ApiResponse<T = any> implements IApiResponse<T> {
  public readonly success: boolean;

  constructor(
    public readonly statusCode: number,
    public readonly data: T | null = null,
    public readonly message: string = 'Success'
  ) {
    this.success = this.statusCode >= 200 && this.statusCode < 300;
  }
}