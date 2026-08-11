import { Worker, type Job } from "bullmq";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { QUEUE_NAMES, getQueueConnection, type QueueName } from "./queues";

const stubHandler = async (job: Job) => {
  logger.info(
    { queue: job.queueName, jobId: job.id, name: job.name, data: job.data },
    "Processing background job (stub)",
  );
};

const startWorkers = () => {
  const connection = getQueueConnection();
  if (!connection) {
    logger.error("REDIS_URL is required to run the worker process");
    process.exit(1);
  }

  const queueNames: QueueName[] = [
    QUEUE_NAMES.email,
    QUEUE_NAMES.notifications,
    QUEUE_NAMES.reports,
    QUEUE_NAMES.webhooks,
    QUEUE_NAMES.imageProcessing,
  ];

  const workers = queueNames.map(
    (name) =>
      new Worker(name, stubHandler, {
        connection,
        concurrency: 5,
      }),
  );

  for (const worker of workers) {
    worker.on("completed", (job) => {
      logger.info({ queue: worker.name, jobId: job.id }, "Job completed");
    });
    worker.on("failed", (job, err) => {
      logger.error({ err, queue: worker.name, jobId: job?.id }, "Job failed");
    });
  }

  logger.info(
    { queues: queueNames, env: env.NODE_ENV },
    "BullMQ workers started",
  );

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down workers");
    await Promise.all(workers.map((worker) => worker.close()));
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
};

startWorkers();
