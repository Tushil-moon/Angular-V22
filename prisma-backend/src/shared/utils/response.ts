import type { Response } from "express";

export const sendSuccess = <T>(res: Response, data: T, message = "OK", statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

export const sendCreated = <T>(res: Response, data: T, message = "Created") =>
  sendSuccess(res, data, message, 201);
