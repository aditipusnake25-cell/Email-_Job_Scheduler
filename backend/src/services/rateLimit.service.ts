import crypto from "crypto";
import { redisClient } from "../config/redis.js";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  resetTime: Date;
}

// In-memory fallback if Redis is temporarily unreachable
const inMemoryStore = new Map<string, number[]>();

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local memberId = ARGV[4]

-- Remove timestamps outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current items in window
local current = redis.call('ZCARD', key)

if current < limit then
  redis.call('ZADD', key, now, memberId)
  redis.call('PEXPIRE', key, window)
  return { 1, current + 1, 0 }
else
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetTime = now + window
  if oldest and oldest[2] then
    resetTime = tonumber(oldest[2]) + window
  end
  return { 0, current, resetTime }
end
`;

export const RateLimitService = {
  async checkAndConsume(
    senderEmail: string,
    customLimit?: number
  ): Promise<RateLimitResult> {
    const limit = customLimit || config.queue.maxEmailsPerHourPerSender;
    const windowMs = 3600 * 1000; // 1 hour in ms
    const now = Date.now();
    const key = `ratelimit:sender:${senderEmail.toLowerCase().trim()}`;
    const memberId = `${now}-${crypto.randomBytes(4).toString("hex")}`;

    try {
      if (redisClient.status === "ready" || redisClient.status === "connect") {
        const result = (await redisClient.eval(
          SLIDING_WINDOW_LUA,
          1,
          key,
          now.toString(),
          windowMs.toString(),
          limit.toString(),
          memberId
        )) as [number, number, number];

        const [allowedFlag, currentCount, resetTimeMs] = result;
        const allowed = allowedFlag === 1;
        const resetDate = allowed
          ? new Date(now + windowMs)
          : new Date(resetTimeMs || now + windowMs);

        logger.debug("Rate limit evaluated via Redis", {
          senderEmail,
          allowed,
          currentCount,
          limit,
          resetDate,
        });

        return {
          allowed,
          currentCount,
          limit,
          resetTime: resetDate,
        };
      }
    } catch (err) {
      logger.warn("Redis rate limit eval failed, falling back to in-memory limiter", {
        error: (err as Error).message,
      });
    }

    // Fallback in-memory sliding window
    let timestamps = inMemoryStore.get(key) || [];
    timestamps = timestamps.filter((t) => t > now - windowMs);

    if (timestamps.length < limit) {
      timestamps.push(now);
      inMemoryStore.set(key, timestamps);
      return {
        allowed: true,
        currentCount: timestamps.length,
        limit,
        resetTime: new Date(now + windowMs),
      };
    } else {
      const oldest = timestamps[0] || now;
      const resetTime = new Date(oldest + windowMs);
      return {
        allowed: false,
        currentCount: timestamps.length,
        limit,
        resetTime,
      };
    }
  },

  async getSenderCurrentCount(senderEmail: string): Promise<number> {
    const key = `ratelimit:sender:${senderEmail.toLowerCase().trim()}`;
    const windowMs = 3600 * 1000;
    const now = Date.now();

    try {
      if (redisClient.status === "ready" || redisClient.status === "connect") {
        await redisClient.zremrangebyscore(key, 0, now - windowMs);
        const count = await redisClient.zcard(key);
        return count;
      }
    } catch {
      // fallback
    }

    const timestamps = (inMemoryStore.get(key) || []).filter((t) => t > now - windowMs);
    return timestamps.length;
  },

  async resetSenderLimit(senderEmail: string): Promise<void> {
    const key = `ratelimit:sender:${senderEmail.toLowerCase().trim()}`;
    try {
      await redisClient.del(key);
    } catch {
      // fallback
    }
    inMemoryStore.delete(key);
  },
};
