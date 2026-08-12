import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../config/env";
import { AppError } from "../shared/errors/app-error";
import { isAllowedImageMimeType } from "../shared/storage/object-storage";

const storage = multer.memoryStorage();

export const imageUpload = multer({
  storage,
  limits: {
    fileSize: env.UPLOAD_MAX_BYTES,
    files: 10,
  },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedImageMimeType(file.mimetype)) {
      callback(
        new AppError(
          400,
          "Only JPEG, PNG, WebP, and GIF images are allowed",
          "INVALID_FILE_TYPE",
        ),
      );
      return;
    }
    callback(null, true);
  },
});

export const handleUpload =
  (middleware: ReturnType<typeof imageUpload.single>) =>
  (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          next(
            new AppError(
              400,
              `Image must be ${Math.round(env.UPLOAD_MAX_BYTES / (1024 * 1024))}MB or smaller`,
              "FILE_TOO_LARGE",
            ),
          );
          return;
        }
        next(new AppError(400, error.message, "UPLOAD_ERROR"));
        return;
      }
      next(error);
    });
  };
