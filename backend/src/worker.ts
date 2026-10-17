import "dotenv/config";
import { connectDatabase } from "./config/database.js";
import { createEmailWorker } from "./workers/email.worker.js";
import { SchedulerService } from "./services/scheduler.service.js";
import { logger } from "./utils/logger.js";

async function startWorker() {
  try {
    logger.info("Starting ReachInbox BullMQ Email Worker...");
    await connectDatabase();

    // Reconcile pending jobs across process restarts
    await SchedulerService.reconcilePendingJobs();

    const worker = createEmailWorker();
    logger.info("Worker process initialized and actively listening for email jobs.");

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down worker gracefully...`);
      await worker.close();
      logger.info("Worker stopped.");
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    logger.error("Failed to start worker process", err);
    process.exit(1);
  }
}

startWorker();
