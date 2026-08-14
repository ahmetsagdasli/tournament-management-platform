import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

type ValidationTarget = 'body' | 'params' | 'query';

export function validate(schema: ZodTypeAny, target: ValidationTarget): RequestHandler {
  return (req, _res, next) => {
    try {
      req[target] = schema.parse(req[target]);
      next();
    } catch (error) {
      next(error);
    }
  };
}
