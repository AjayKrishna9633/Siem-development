import type { IApiResponse } from '../IAPIResponse.ts';

export class ApiResponse<T = any> implements IApiResponse<T> {
  public readonly success: boolean;

  constructor(
    public readonly statusCode: number,
    public readonly data: T | null = null,
    public readonly message: string = 'Success',
    // Machine-readable reason on errors (an AppErrorCode), e.g. SETUP_REQUIRED
    public readonly code?: string,
  ) {
    this.success = this.statusCode >= 200 && this.statusCode < 300;
  }
}
