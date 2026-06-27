import pino from "pino";
import { env, isServerless, usePooledDatabase } from "./env";

/** Pretty transport breaks in Vercel/Lambda (devDependency + worker threads). */
const usePrettyTransport = !usePooledDatabase && !isServerless;

export const logger = pino({
  level: usePooledDatabase || isServerless ? "info" : "debug",
  redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token", "*.refreshToken"],
  ...(usePrettyTransport
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      }
    : {}),
  base: { env: env.NODE_ENV },
});
