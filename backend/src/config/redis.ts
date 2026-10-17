import { Redis } from "ioredis";
import { config } from "./env.js";
import { logger } from "../utils/logger.js";

const isPlaceholderUrl = config.redis.url.includes("YOUR_UPSTASH");

function createRedisClient(customOptions = {}): Redis {
  const isTls = config.redis.url.startsWith("rediss://");

  const options = {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    connectTimeout: 3000,
    commandTimeout: 3000,
    lazyConnect: true, // Don't block process start
    retryStrategy(times: number) {
      if (isPlaceholderUrl) {
        return null; // Don't retry if placeholder is present
      }
      return Math.min(times * 200, 3000);
    },
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    ...customOptions,
  };

  const client = new Redis(config.redis.url, options);

  client.on("connect", () => {
    logger.info("Redis client connected");
  });

  client.on("ready", () => {
    logger.info("Redis client ready");
  });

  client.on("error", (err) => {
    if (!isPlaceholderUrl) {
      logger.warn("Redis connection error (verify REDIS_URL)", { message: err.message });
    }
  });

  // Only auto-connect if not placeholder
  if (!isPlaceholderUrl) {
    client.connect().catch(() => {});
  }

  return client;
}

export const redisClient = createRedisClient();

export function getRedisConnection(): Redis {
  return createRedisClient();
}

export async function checkRedisHealth(): Promise<{
  status: "connected" | "disconnected";
  ping?: string;
  error?: string;
}> {
  if (isPlaceholderUrl) {
    return {
      status: "disconnected",
      error: "REDIS_URL contains placeholder. Configure real Upstash connection in backend/.env",
    };
  }

  try {
    if (redisClient.status !== "ready" && redisClient.status !== "connect") {
      await redisClient.connect();
    }
    const res = await redisClient.ping();
    return { status: "connected", ping: res };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "disconnected", error: message };
  }
}
