import { Router, Response } from "express";
import { EmailQueueService } from "../queues/email.queue.js";
import { checkRedisHealth } from "../config/redis.js";
import { checkElasticsearchHealth } from "../config/elasticsearch.js";

const router = Router();

router.get("/health", async (_req, res: Response) => {
  const [queueMetrics, redisStatus, esStatus] = await Promise.all([
    EmailQueueService.getHealth(),
    checkRedisHealth(),
    checkElasticsearchHealth(),
  ]);

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    queue: queueMetrics,
    services: {
      redis: redisStatus,
      elasticsearch: esStatus,
    },
  });
});

export default router;
