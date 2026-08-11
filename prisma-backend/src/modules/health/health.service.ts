import { isRedisEnabled, pingRedis } from "../../config/redis";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";

export const healthService = {
  async check() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { database: "connected" as const };
    } catch {
      throw new AppError(503, "Database unavailable", "DATABASE_UNAVAILABLE", {
        database: "disconnected",
      });
    }
  },

  live() {
    return { status: "ok" as const };
  },

  async ready() {
    let databaseOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseOk = true;
    } catch {
      databaseOk = false;
    }

    const redisConfigured = isRedisEnabled();
    let redisOk = false;
    if (redisConfigured) {
      redisOk = await pingRedis();
    }

    const redisOptionalInDev = env.NODE_ENV !== "production" && !redisConfigured;
    const ready = databaseOk && (redisOk || redisOptionalInDev);

    const payload = {
      status: ready ? ("ready" as const) : ("not_ready" as const),
      database: databaseOk ? ("connected" as const) : ("disconnected" as const),
      redis: redisConfigured
        ? redisOk
          ? ("connected" as const)
          : ("disconnected" as const)
        : ("disabled" as const),
    };

    if (!ready) {
      throw new AppError(503, "Service not ready", "NOT_READY", payload);
    }

    return payload;
  },
};
