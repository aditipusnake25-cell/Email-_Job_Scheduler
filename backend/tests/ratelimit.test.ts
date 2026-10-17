import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { RateLimitService } from "../src/services/rateLimit.service.js";

describe("Rate Limiting Service", () => {
  const testSender = "sender-test@reachinbox.test";

  beforeEach(async () => {
    await RateLimitService.resetSenderLimit(testSender);
  });

  test("allows requests within configured hourly limit", async () => {
    const limit = 5;
    const res1 = await RateLimitService.checkAndConsume(testSender, limit);
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.currentCount, 1);
    assert.strictEqual(res1.limit, 5);

    const res2 = await RateLimitService.checkAndConsume(testSender, limit);
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.currentCount, 2);
  });

  test("blocks and calculates future reset time when limit is exhausted", async () => {
    const limit = 3;

    // Consume all 3 slots
    await RateLimitService.checkAndConsume(testSender, limit);
    await RateLimitService.checkAndConsume(testSender, limit);
    await RateLimitService.checkAndConsume(testSender, limit);

    // 4th request must be rejected
    const blockedRes = await RateLimitService.checkAndConsume(testSender, limit);
    assert.strictEqual(blockedRes.allowed, false, "Should block once limit is reached");
    assert.strictEqual(blockedRes.currentCount, 3);
    assert.ok(
      blockedRes.resetTime.getTime() > Date.now(),
      "Reset time must be in the future"
    );
  });
});
