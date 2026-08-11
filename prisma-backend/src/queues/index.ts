import { Queue, type ConnectionOptions, type JobsOptions } from "bullmq";
import { env } from "../config/env";
import { logger } from "../config/logger";

export const QUEUE_NAMES = {
  email: "email",
  notifications: "notifications",
  reports: "reports",
  webhooks: "webhooks",
  imageProcessing: "image-processing",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

let connection: ConnectionOptions | null = null;

export const getQueueConnection = (): ConnectionOptions | null => {
  if (!env.REDIS_URL) return null;
  if (!connection) {
    connection = { url: env.REDIS_URL, maxRetriesPerRequest: null };
  }
  return connection;
};

const queues = new Map<QueueName, Queue>();

export const getQueue = (name: QueueName): Queue | null => {
  const conn = getQueueConnection();
  if (!conn) {
    logger.warn({ queue: name }, "Queue unavailable — REDIS_URL is not set");
    return null;
  }

  const existing = queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, {
    connection: conn,
    defaultJobOptions,
  });
  queues.set(name, queue);
  return queue;
};

export const enqueue = async <T extends Record<string, unknown>>(
  name: QueueName,
  jobName: string,
  data: T,
  options?: JobsOptions,
) => {
  const queue = getQueue(name);
  if (!queue) {
    logger.warn({ queue: name, jobName }, "Skipped enqueue — Redis not configured");
    return null;
  }

  return queue.add(jobName, data, options);
};

export const closeQueues = async () => {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
};
