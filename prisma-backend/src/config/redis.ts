import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let redisClient: Redis | null = null;

if (env.REDIS_URL) {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redisClient.on("error", (err) => {
    logger.error({ err }, "Redis connection error");
  });
} else {
  logger.warn("REDIS_URL is not set — Redis client disabled (dev/optional mode)");
}

export const redis = redisClient;

export const isRedisEnabled = (): boolean => redis !== null;

export const pingRedis = async (): Promise<boolean> => {
  if (!redis) return false;

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
};
