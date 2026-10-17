import { withTransaction } from "../config/database.js";
import { CampaignModel, Campaign } from "../models/Campaign.js";
import { EmailModel, EmailRecord } from "../models/Email.js";
import { SenderModel } from "../models/Sender.js";
import { EmailQueueService, EmailJobData } from "../queues/email.queue.js";
import { SearchService } from "./search.service.js";
import { generateIdempotencyKey } from "../utils/idempotency.js";
import { logger } from "../utils/logger.js";

export interface ScheduleBatchInput {
  userId: string;
  senderEmail: string;
  senderName?: string;
  name?: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delaySeconds?: number;
  hourlyLimit?: number;
  idempotencyKey?: string;
}

export interface ScheduleBatchResult {
  campaign: Campaign;
  emailsCount: number;
  firstScheduledAt: Date;
  lastScheduledAt: Date;
}

export const SchedulerService = {
  async scheduleBatch(input: ScheduleBatchInput): Promise<ScheduleBatchResult> {
    const delaySeconds = Math.max(0, input.delaySeconds ?? 2);
    const hourlyLimit = Math.max(1, input.hourlyLimit ?? 200);
    const startMs = input.startTime.getTime();

    // Clean and deduplicate recipient emails
    const uniqueRecipients = Array.from(
      new Set(
        input.recipients
          .map((r) => r.trim().toLowerCase())
          .filter((r) => r.length > 3 && r.includes("@") && r.includes("."))
      )
    );

    if (uniqueRecipients.length === 0) {
      throw new Error("No valid email recipients provided");
    }

    // Step 1: Ensure sender exists
    const sender = await SenderModel.findOrCreateDefault(
      input.userId,
      input.senderEmail,
      input.senderName || input.senderEmail.split("@")[0] || "ReachInbox User"
    );

    // Step 2: Create Campaign and Email records within a DB transaction
    const result = await withTransaction(async () => {
      const campaignName = input.name || `Campaign: ${input.subject.slice(0, 40)} (${uniqueRecipients.length} recipients)`;

      const campaign = await CampaignModel.create({
        userId: input.userId,
        senderId: sender.id,
        name: campaignName,
        startAt: input.startTime,
        delaySeconds,
        hourlyLimit,
        totalEmails: uniqueRecipients.length,
      });

      // Calculate staggered schedule times
      const emailItems = uniqueRecipients.map((recipient, index) => {
        const scheduledTime = new Date(startMs + index * delaySeconds * 1000);
        const itemKey = generateIdempotencyKey([
          campaign.id,
          recipient,
          scheduledTime.toISOString(),
          input.idempotencyKey,
        ]);
        return {
          recipient,
          scheduledAt: scheduledTime,
          idempotencyKey: itemKey,
        };
      });

      const emails = await EmailModel.createBatch(
        campaign.id,
        sender.email,
        input.subject,
        input.body,
        emailItems
      );

      return { campaign, emails };
    });

    const { campaign, emails } = result;

    // Step 3: Enqueue jobs in BullMQ and sync to Elasticsearch
    for (const email of emails) {
      const jobData: EmailJobData = {
        emailId: email.id,
        campaignId: campaign.id,
        userId: input.userId,
        senderEmail: sender.email,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        hourlyLimit,
        delaySeconds,
        scheduledAt: email.scheduled_at.toISOString(),
      };

      const job = await EmailQueueService.addEmailJob(
        jobData,
        new Date(email.scheduled_at),
        email.idempotency_key || `email-${email.id}`
      );

      if (job) {
        await EmailModel.updateJobId(email.id, job.id as string);
      }

      // Index in Elasticsearch (non-blocking)
      SearchService.indexEmail(email).catch(() => {});
    }

    const firstScheduledAt = new Date(emails[0]?.scheduled_at || input.startTime);
    const lastScheduledAt = new Date(
      emails[emails.length - 1]?.scheduled_at || input.startTime
    );

    logger.info("Batch scheduled successfully", {
      campaignId: campaign.id,
      emailsCount: emails.length,
      firstScheduledAt,
      lastScheduledAt,
    });

    return {
      campaign,
      emailsCount: emails.length,
      firstScheduledAt,
      lastScheduledAt,
    };
  },

  async reconcilePendingJobs(): Promise<number> {
    logger.info("Running pending email job reconciliation for BullMQ recovery...");
    const pendingEmails = await EmailModel.getPendingForReconciliation();
    let reconciledCount = 0;

    for (const email of pendingEmails) {
      const jobData: EmailJobData = {
        emailId: email.id,
        campaignId: email.campaign_id,
        senderEmail: email.sender_email || "default@reachinbox.test",
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        hourlyLimit: 200,
        delaySeconds: 2,
        scheduledAt: email.scheduled_at.toISOString(),
      };

      const job = await EmailQueueService.addEmailJob(
        jobData,
        new Date(email.scheduled_at),
        email.idempotency_key || `email-${email.id}`
      );

      if (job) {
        reconciledCount++;
      }
    }

    logger.info("Reconciliation complete", {
      totalPendingInDb: pendingEmails.length,
      reconciledToBullMQ: reconciledCount,
    });

    return reconciledCount;
  },

  async rescheduleEmailForRateLimit(
    emailId: string,
    jobData: EmailJobData,
    resetTime: Date
  ): Promise<void> {
    const newJobId = `email-${emailId}-${resetTime.getTime()}`;

    // Update DB state
    await EmailModel.markRescheduled(emailId, resetTime, newJobId);

    // Schedule delayed BullMQ job
    await EmailQueueService.addEmailJob(
      {
        ...jobData,
        scheduledAt: resetTime.toISOString(),
      },
      resetTime,
      newJobId
    );

    logger.warn("Job rescheduled due to sender rate limit", {
      emailId,
      sender: jobData.senderEmail,
      resumeTime: resetTime.toISOString(),
    });
  },
};
