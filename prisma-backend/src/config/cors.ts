import type { CorsOptions } from "cors";
import { env, isProduction } from "./env";

const parseOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isLocalDevOrigin = (origin: string): boolean =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Non-browser clients (Postman, curl) have no Origin header
    if (!origin) {
      callback(null, true);
      return;
    }

    // In development, allow any localhost / 127.0.0.1 port
    if (!isProduction && isLocalDevOrigin(origin)) {
      callback(null, true);
      return;
    }

    if (env.CORS_ORIGIN === "*") {
      callback(null, true);
      return;
    }

    const allowedOrigins = parseOrigins(env.CORS_ORIGIN);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  exposedHeaders: ["Content-Length", "Content-Type"],
  optionsSuccessStatus: 204,
};
