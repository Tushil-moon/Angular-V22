import pino from "pino";
import { env, isProduction } from "./env";

export const logger = pino({
  level: isProduction ? "info" : "debug",
  redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token", "*.refreshToken"],
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
  base: { env: env.NODE_ENV },
});
