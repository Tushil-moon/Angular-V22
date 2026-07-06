import { logger } from "../../config/logger";

type JobHandler = () => Promise<void>;

/** Lightweight async job runner (swap for BullMQ when Redis is available). */
export const enqueueJob = (name: string, handler: JobHandler) => {
  setImmediate(async () => {
    try {
      await handler();
    } catch (error) {
      logger.error({ err: error, job: name }, "Background job failed");
    }
  });
};
