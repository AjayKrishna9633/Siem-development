import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.js';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.js';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.js';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {

      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map(err => ({
         field: err.path.join('.'),
          message: err.message
        }));

        res.status(HttpStatusCode.BAD_REQUEST).json(
          new ApiResponse(HttpStatusCode.BAD_REQUEST, errorMessages, ErrorMessage.VALIDATION_ERROR)
        );
        return;
      }
      next(error);
    }
  };
};