import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ApiResponse } from '../http/helpers/implementation/apiResponse.js';

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

        res.status(400).json(
          new ApiResponse(400, errorMessages, 'Validation Error')
        );
        return;
      }
      next(error);
    }
  };
};