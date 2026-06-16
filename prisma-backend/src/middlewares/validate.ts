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
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params) as Request["params"];
    if (schemas.query) req.query = schemas.query.parse(req.query) as Request["query"];
    next();
  };
