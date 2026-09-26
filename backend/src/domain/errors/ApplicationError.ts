import type { ApplicationErrorCode } from "../types/error-types.js";

export class ApplicationError extends Error {
  override name = 'ApplicationError';
  constructor(public readonly code: ApplicationErrorCode, message: string) {
    super(message);
  }
}