import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../shared/errors/app-error";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
};

const getNestedMessage = (error: unknown): string => {
  const message = getErrorMessage(error);
  const cause =
    typeof error === "object" && error !== null && "cause" in error
      ? (error as { cause?: unknown }).cause
      : undefined;

  if (cause && typeof cause === "object" && cause !== null && "message" in cause) {
    return `${message} ${String((cause as { message: unknown }).message)}`;
  }

  return message;
};

const isDatabaseError = (error: unknown): boolean => {
  const message = getNestedMessage(error).toLowerCase();
  return (
    message.includes("tenant/user") ||
    message.includes("enotfound") ||
    message.includes("econnrefused") ||
    message.includes("password authentication failed") ||
    message.includes("database") ||
    message.includes("prisma") ||
    (typeof error === "object" &&
      error !== null &&
      ("clientVersion" in error || "code" in error))
  );
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`, "NOT_FOUND"));
};

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: error.issues,
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }

  if (isDatabaseError(error)) {
    logger.error({ err: error, path: req.originalUrl }, "Database error");
    return res.status(503).json({
      success: false,
      message: isProduction
        ? "Service temporarily unavailable"
        : "Database connection failed. Verify DATABASE_URL and DIRECT_URL in prisma-backend/.env (Supabase → Settings → Database).",
      code: "DATABASE_UNAVAILABLE",
      ...(isProduction ? {} : { details: getNestedMessage(error) }),
    });
  }

  logger.error({ err: error, path: req.originalUrl }, "Unhandled request error");
  return res.status(500).json({
    success: false,
    message: isProduction ? "Internal server error" : getErrorMessage(error) || "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
};
