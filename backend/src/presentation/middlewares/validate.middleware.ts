import type { Request, Response, NextFunction } from 'express';
import { ZodError, ZodObject, type ZodSchema } from 'zod';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema instanceof ZodObject && 'body' in schema.shape) {
        await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
      } else {
        await schema.parseAsync(req.body);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res
          .status(HttpStatusCode.BAD_REQUEST)
          .json(
            new ApiResponse(
              HttpStatusCode.BAD_REQUEST,
              errorMessages,
              ErrorMessage.VALIDATION_ERROR,
            ),
          );
        return;
      }
      next(error);
    }
  };
};
