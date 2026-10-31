import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../domain/errors/AppError.ts';
import { AppErrorCode } from '../../domain/enums/AppErrorCode.ts';
import { DomainError } from '../../domain/errors/DomainError.ts';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

const statusByCode: Record<AppErrorCode, number> = {
  [AppErrorCode.SETUP_REQUIRED]: HttpStatusCode.FORBIDDEN,
  // Setup routes stop existing once setup is done, so they answer like an unknown route
  [AppErrorCode.SETUP_ALREADY_COMPLETED]: HttpStatusCode.NOT_FOUND,
  [AppErrorCode.INVALID_SETUP_TOKEN]: HttpStatusCode.BAD_REQUEST,
  [AppErrorCode.OTP_INVALID]: HttpStatusCode.BAD_REQUEST,
  [AppErrorCode.INVALID_CREDENTIALS]: HttpStatusCode.UNAUTHORIZED,
  [AppErrorCode.ACCOUNT_INACTIVE]: HttpStatusCode.FORBIDDEN,
  [AppErrorCode.UNAUTHORIZED]: HttpStatusCode.UNAUTHORIZED,
  [AppErrorCode.TOKEN_EXPIRED]: HttpStatusCode.UNAUTHORIZED,
  [AppErrorCode.INVALID_TOKEN]: HttpStatusCode.UNAUTHORIZED,
  [AppErrorCode.USER_NOT_FOUND]: HttpStatusCode.NOT_FOUND,
  [AppErrorCode.INVALID_RESET_TOKEN]: HttpStatusCode.BAD_REQUEST,
  [AppErrorCode.FORBIDDEN]: HttpStatusCode.FORBIDDEN,
  [AppErrorCode.USER_ALREADY_EXISTS]: HttpStatusCode.CONFLICT,
  [AppErrorCode.VALIDATION_ERROR]: HttpStatusCode.BAD_REQUEST,
  [AppErrorCode.INVALID_REFRESH_TOKEN]: HttpStatusCode.UNAUTHORIZED,
  [AppErrorCode.SESSION_REVOKED]: HttpStatusCode.UNAUTHORIZED,
  [AppErrorCode.INVALID_ACTIVATION]: HttpStatusCode.BAD_REQUEST,
  // 400 rather than 401: a wrong current password must not look like an expired session
  [AppErrorCode.INVALID_VERIFICATION_CODE]: HttpStatusCode.BAD_REQUEST,
  [AppErrorCode.INVALID_CURRENT_PASSWORD]: HttpStatusCode.BAD_REQUEST,
  [AppErrorCode.SAME_PASSWORD]: HttpStatusCode.BAD_REQUEST,
  [AppErrorCode.SAME_EMAIL]: HttpStatusCode.BAD_REQUEST,
  [AppErrorCode.EMAIL_TAKEN]: HttpStatusCode.CONFLICT,
  [AppErrorCode.LAST_ADMIN]: HttpStatusCode.CONFLICT,
  [AppErrorCode.CANNOT_CHANGE_OWN_ACCESS]: HttpStatusCode.FORBIDDEN,
};

// Postgres error 22P02, e.g. "invalid input syntax for type uuid"
const PG_INVALID_TEXT_REPRESENTATION = '22P02';
// Postgres error 23505: a unique index rejected a duplicate
const PG_UNIQUE_VIOLATION = '23505';

// TypeORM copies the driver's error code onto its QueryFailedError
const isPostgresError = (err: unknown, code: string): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === code;

// Two requests can both pass a "does it exist?" check before either saves; the unique
// index then rejects the second. The column comes from Postgres's detail text,
// e.g. "Key (email)=(a@b.co) already exists."
const duplicateMessage = (err: unknown): string => {
  const detail =
    typeof err === 'object' && err !== null && 'detail' in err && typeof err.detail === 'string'
      ? err.detail
      : '';
  const column = /^Key \((\w+)\)/.exec(detail)?.[1];
  if (column === 'email') return ErrorMessage.USER_ALREADY_EXISTS;
  return ErrorMessage.DUPLICATE_VALUE;
};

// express.json() tags its own failures with a `type`
const bodyParserErrorType = (err: unknown): string | undefined =>
  typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string'
    ? err.type
    : undefined;

// Unmatched routes answer in the same JSON shape as every other error
export const notFoundHandler: RequestHandler = (_req, res): void => {
  res
    .status(HttpStatusCode.NOT_FOUND)
    .json(new ApiResponse(HttpStatusCode.NOT_FOUND, null, ErrorMessage.ROUTE_NOT_FOUND));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next): void => {
  const parserError = bodyParserErrorType(err);
  if (parserError === 'entity.parse.failed') {
    res
      .status(HttpStatusCode.BAD_REQUEST)
      .json(new ApiResponse(HttpStatusCode.BAD_REQUEST, null, ErrorMessage.INVALID_JSON));
    return;
  }
  if (parserError === 'entity.too.large') {
    res
      .status(HttpStatusCode.PAYLOAD_TOO_LARGE)
      .json(
        new ApiResponse(HttpStatusCode.PAYLOAD_TOO_LARGE, null, ErrorMessage.PAYLOAD_TOO_LARGE),
      );
    return;
  }

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
    res.status(statusCode).json(new ApiResponse(statusCode, null, err.message, err.code));
    return;
  }

  if (err instanceof DomainError) {
    res
      .status(HttpStatusCode.UNPROCESSABLE_ENTITY)
      .json(new ApiResponse(HttpStatusCode.UNPROCESSABLE_ENTITY, null, err.message));
    return;
  }

  // Safety net: a malformed UUID that slipped past request validation reached Postgres
  if (isPostgresError(err, PG_INVALID_TEXT_REPRESENTATION)) {
    res
      .status(HttpStatusCode.BAD_REQUEST)
      .json(new ApiResponse(HttpStatusCode.BAD_REQUEST, null, ErrorMessage.INVALID_ID));
    return;
  }

  if (isPostgresError(err, PG_UNIQUE_VIOLATION)) {
    res
      .status(HttpStatusCode.CONFLICT)
      .json(new ApiResponse(HttpStatusCode.CONFLICT, null, duplicateMessage(err)));
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
