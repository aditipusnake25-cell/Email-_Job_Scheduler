import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { config } from "../config/env.js";
import { EmailJobData } from "../queues/email.queue.js";
import { EmailModel } from "../models/Email.js";
import { CampaignModel } from "../models/Campaign.js";
import { RateLimitService } from "../services/rateLimit.service.js";
import { EmailService } from "../services/email.service.js";
import { SlackService } from "../services/slack.service.js";
import { SchedulerService } from "../services/scheduler.service.js";
import { SearchService } from "../services/search.service.js";
import { logger } from "../utils/logger.js";

// Helper for delay spacing
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createEmailWorker(): Worker<EmailJobData> {
  const connection = getRedisConnection();

  const worker = new Worker<EmailJobData>(
    config.queue.name,
    async (job: Job<EmailJobData>) => {
      const data = job.data;
      logger.info(`[Worker] Processing email job`, {
        jobId: job.id,
        emailId: data.emailId,
        recipient: data.recipient,
        sender: data.senderEmail,
      });

      // Step 1: Check distributed atomic rate limit per sender
      const rateLimitResult = await RateLimitService.checkAndConsume(
        data.senderEmail,
        data.hourlyLimit
      );

      if (!rateLimitResult.allowed) {
        logger.warn(
          `[Worker] Sender rate limit reached (${data.senderEmail}: ${rateLimitResult.currentCount}/${rateLimitResult.limit}). Rescheduling job.`,
          { resetTime: rateLimitResult.resetTime.toISOString() }
        );

        // Reschedule job to the next hourly window without dropping it
        await SchedulerService.rescheduleEmailForRateLimit(
          data.emailId,
          data,
          rateLimitResult.resetTime
        );

        // Notify connected Slack workspace asynchronously
        SlackService.sendRateLimitNotification({
          userId: data.userId,
          senderEmail: data.senderEmail,
          limit: rateLimitResult.limit,
          resetTime: rateLimitResult.resetTime,
          recipient: data.recipient,
        }).catch(() => {});

        return {
          status: "rescheduled",
          rescheduledTo: rateLimitResult.resetTime,
          reason: "Hourly sender limit reached",
        };
      }

      // Step 2: Enforce configurable delay between sends
      const minDelay = Math.max(data.delaySeconds * 1000, config.queue.emailDelayMs);
      if (minDelay > 0) {
        await sleep(minDelay);
      }

      // Step 3: Dispatch email via Ethereal SMTP
      const sendResult = await EmailService.sendEmail({
        from: data.senderEmail,
        to: data.recipient,
        subject: data.subject,
        body: data.body,
      });

      if (sendResult.success) {
        await EmailModel.markSent(data.emailId, sendResult.previewUrl);
        await CampaignModel.incrementSent(data.campaignId);
        SearchService.updateEmailStatus(data.emailId, "sent").catch(() => {});

        logger.info(`[Worker] Email successfully sent`, {
          emailId: data.emailId,
          recipient: data.recipient,
          previewUrl: sendResult.previewUrl,
        });

        return {
          status: "sent",
          previewUrl: sendResult.previewUrl,
          messageId: sendResult.messageId,
        };
      } else {
        const errorMsg = sendResult.error || "Unknown SMTP delivery error";
        await EmailModel.markFailed(data.emailId, errorMsg);
        await CampaignModel.incrementFailed(data.campaignId);
        SearchService.updateEmailStatus(data.emailId, "failed").catch(() => {});

        logger.error(`[Worker] Email delivery failed`, {
          emailId: data.emailId,
          recipient: data.recipient,
          error: errorMsg,
        });

        throw new Error(errorMsg);
      }
    },
    {
      connection,
      concurrency: config.queue.workerConcurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.debug(`[Worker] Job completed successfully`, { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.warn(`[Worker] Job attempt failed`, { jobId: job?.id, error: err.message });
  });

  worker.on("error", (err) => {
    logger.warn(`[Worker] BullMQ worker connection error`, { error: err.message });
  });

  return worker;
}
