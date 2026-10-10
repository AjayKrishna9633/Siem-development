import type { AppErrorCode } from "../enums/AppErrorCode.js";

export class AppError extends Error {
  override name = 'AppError';
  constructor(public readonly code: AppErrorCode, message: string) {
    super(message);
  }
}