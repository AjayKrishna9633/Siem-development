import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { DomainError } from '../../domain/errors/DomainError.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

const statusByCode: Record<AppErrorCode, number> = {
  [AppErrorCode.SETUP_DISABLED]: HttpStatusCode.NOT_FOUND,
  [AppErrorCode.INVALID_SETUP_TOKEN]: HttpStatusCode.UNAUTHORIZED,
  [AppErrorCode.SETUP_ALREADY_DONE]: HttpStatusCode.CONFLICT,
  [AppErrorCode.OTP_EXPIRED]: HttpStatusCode.BAD_REQUEST,
  [AppErrorCode.OTP_INVALID]: HttpStatusCode.BAD_REQUEST,
  [AppErrorCode.INVALID_CREDENTIALS]: HttpStatusCode.UNAUTHORIZED,
  [AppErrorCode.ACCOUNT_LOCKED]: HttpStatusCode.FORBIDDEN,
  [AppErrorCode.ACCOUNT_INACTIVE]: HttpStatusCode.FORBIDDEN,
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next): void => {
  if (err instanceof ZodError) {
    const errorMessages = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res
      .status(HttpStatusCode.BAD_REQUEST)
      .json(
        new ApiResponse(HttpStatusCode.BAD_REQUEST, errorMessages, ErrorMessage.VALIDATION_ERROR),
      );
    return;
  }

  if (err instanceof AppError) {
    const statusCode = statusByCode[err.code] || HttpStatusCode.BAD_REQUEST;
    res.status(statusCode).json(new ApiResponse(statusCode, null, err.message));
    return;
  }

  if (err instanceof DomainError) {
    res
      .status(HttpStatusCode.UNPROCESSABLE_ENTITY)
      .json(new ApiResponse(HttpStatusCode.UNPROCESSABLE_ENTITY, null, err.message));
    return;
  }

  console.error('[Unhandled Exception]:', err);
  res
    .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
    .json(
      new ApiResponse(
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        null,
        ErrorMessage.INTERNAL_SERVER_ERROR,
      ),
    );
};
