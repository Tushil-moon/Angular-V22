import type { Response } from "express";
import { toSnakeCaseDeep } from "./snake-case";

const serializeData = <T>(data: T): T | null =>
  data === null || data === undefined ? null : toSnakeCaseDeep(data);

export const sendSuccess = <T>(res: Response, data: T, message = "OK", statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    message,
    data: serializeData(data),
  });

export const sendCreated = <T>(res: Response, data: T, message = "Created") =>
  sendSuccess(res, data, message, 201);
