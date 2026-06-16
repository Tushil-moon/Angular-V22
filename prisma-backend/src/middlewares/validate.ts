import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

type AnyZodObject = z.ZodObject<z.ZodRawShape>;

type Schemas = {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
};

export const validate =
  (schemas: Schemas) => (req: Request, _res: Response, next: NextFunction) => {
    const validated = req.validated ?? {};

    if (schemas.body) {
      validated.body = schemas.body.parse(req.body);
      req.body = validated.body;
    }

    if (schemas.params) {
      validated.params = schemas.params.parse(req.params);
      req.params = validated.params as Request["params"];
    }

    if (schemas.query) {
      // Express 5: req.query is read-only — store parsed query on req.validated
      validated.query = schemas.query.parse(req.query);
    }

    if (Object.keys(validated).length > 0) {
      req.validated = validated;
    }

    next();
  };

export const getValidatedQuery = <T>(req: Request): T => req.validated?.query as T;

export const getValidatedBody = <T>(req: Request): T =>
  (req.validated?.body ?? req.body) as T;

export const getValidatedParams = <T>(req: Request): T =>
  (req.validated?.params ?? req.params) as T;
