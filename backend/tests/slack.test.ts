import { test, describe } from "node:test";
import assert from "node:assert";
import { SlackService } from "../src/services/slack.service.js";

describe("Slack Integration Service", () => {
  test("generates valid OAuth authorization URL with encoded state", () => {
    const userId = "user-123";
    const authUrl = SlackService.getAuthorizationUrl(userId);

    assert.ok(authUrl.startsWith("https://slack.com/oauth/v2/authorize"));
    assert.ok(authUrl.includes("client_id="));
    assert.ok(authUrl.includes("scope="));
    assert.ok(authUrl.includes("state="));

    // Decode state parameter
    const urlObj = new URL(authUrl);
    const stateParam = urlObj.searchParams.get("state");
    assert.ok(stateParam, "State param should be present");

    const decoded = JSON.parse(Buffer.from(stateParam, "base64").toString("utf8"));
    assert.strictEqual(decoded.userId, userId);
  });

  test("handles notification gracefully when Slack is not yet connected", async () => {
    const sent = await SlackService.sendRateLimitNotification({
      userId: "non-existent-user",
      senderEmail: "unlinked-sender@test.com",
      limit: 100,
      resetTime: new Date(Date.now() + 3600000),
    });

    // Should return false and not throw an error
    assert.strictEqual(sent, false);
  });
});
