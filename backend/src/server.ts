import "dotenv/config";
import app from "./app.js";
import { config } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { initializeElasticsearchIndex } from "./config/elasticsearch.js";
import { SchedulerService } from "./services/scheduler.service.js";
import { logger } from "./utils/logger.js";

async function startServer() {
  try {
    logger.info("Starting ReachInbox Email Scheduler API server...");
    await connectDatabase();

    // Initialize search index (degrades gracefully if ES is offline)
    initializeElasticsearchIndex().catch(() => {});

    // Reconcile pending scheduled email jobs from PostgreSQL into BullMQ
    SchedulerService.reconcilePendingJobs().catch((err) => {
      logger.warn("Pending job reconciliation deferred until Redis is reachable", {
        error: (err as Error).message,
      });
    });

    const server = app.listen(config.port, () => {
      logger.info(`Server running at http://localhost:${config.port}`);
      logger.info(`Bull Board queue dashboard available at http://localhost:${config.port}/admin/queues`);
      logger.info(`Health check available at http://localhost:${config.port}/health`);
    });

    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}. Shutting down API server gracefully...`);
      server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();
