import { Queue, Job } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface EmailJobData {
  emailId: string;
  campaignId: string;
  userId?: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  hourlyLimit: number;
  delaySeconds: number;
  scheduledAt: string;
}

const redisConnection = getRedisConnection();

export const emailQueue = new Queue<EmailJobData>(config.queue.name, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 200,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

emailQueue.on("error", (err) => {
  logger.warn("BullMQ queue connection error (check Redis)", { error: err.message });
});

export const EmailQueueService = {
  async addEmailJob(
    data: EmailJobData,
    scheduledAt: Date,
    customJobId?: string
  ): Promise<Job<EmailJobData> | null> {
    const now = Date.now();
    const delay = Math.max(0, scheduledAt.getTime() - now);
    const jobId = customJobId || `email-${data.emailId}`;

    try {
      // Check if job already exists to guarantee idempotency
      const existingJob = await emailQueue.getJob(jobId);
      if (existingJob) {
        logger.info("Email job already queued (idempotency preserved)", { jobId, emailId: data.emailId });
        return existingJob;
      }

      const job = await emailQueue.add("send-email", data, {
        jobId,
        delay,
      });

      logger.info("Email job successfully scheduled in BullMQ", {
        jobId: job.id,
        emailId: data.emailId,
        delayMs: delay,
        scheduledAt: scheduledAt.toISOString(),
      });

      return job;
    } catch (err) {
      logger.error("Failed to add job to BullMQ queue", { error: (err as Error).message, emailId: data.emailId });
      return null;
    }
  },

  async getHealth(): Promise<{
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
    isPaused: boolean;
  }> {
    if (config.redis.url.includes("YOUR_UPSTASH")) {
      return { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0, isPaused: false };
    }

    try {
      const countsPromise = Promise.all([
        emailQueue.getWaitingCount(),
        emailQueue.getActiveCount(),
        emailQueue.getDelayedCount(),
        emailQueue.getCompletedCount(),
        emailQueue.getFailedCount(),
        emailQueue.isPaused(),
      ]);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Queue health check timeout")), 2500)
      );

      const [waiting, active, delayed, completed, failed, isPaused] = await Promise.race([
        countsPromise,
        timeoutPromise,
      ]);

      return { waiting, active, delayed, completed, failed, isPaused };
    } catch (err) {
      logger.warn("Could not retrieve BullMQ health metrics", { error: (err as Error).message });
      return { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0, isPaused: false };
    }
  },
};
