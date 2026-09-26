import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApplicationError } from '../../domain/errors/ApplicationError.js';
import type { ApplicationErrorCode } from '../../domain/types/error-types.js';
import { DomainError } from '../../domain/errors/DomainError.js';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.js';

const statusByCode: Record<ApplicationErrorCode, number> = {
  SETUP_DISABLED: 404,
  INVALID_SETUP_TOKEN: 401,
  SETUP_ALREADY_DONE: 409,
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next): void => {
  
  if (err instanceof ZodError) {
    const errorMessages = err.issues.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    res.status(400).json(new ApiResponse(400, errorMessages, 'Validation Error'));
    return;
  }

  
  if (err instanceof ApplicationError) {
    const statusCode = statusByCode[err.code] || 400;
    res.status(statusCode).json(new ApiResponse(statusCode, null, err.message));
    return;
  }

  if (err instanceof DomainError) {
    res.status(422).json(new ApiResponse(422, null, err.message));
    return;
  }

 
  console.error('[Unhandled Exception]:', err);
  res.status(500).json(new ApiResponse(500, null, 'Internal Server Error'));
};