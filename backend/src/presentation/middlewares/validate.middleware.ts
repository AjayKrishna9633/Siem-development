import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

// Validates the request body and replaces it with the parsed result, so controllers
// only ever see cleaned data: strings trimmed and unknown fields stripped. A ZodError
// goes to the error handler, which formats it as a 400 with per-field messages.
export const validate = (schema: ZodType) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};
