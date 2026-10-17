import { WebClient } from "@slack/web-api";
import { query } from "../config/database.js";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface SlackIntegration {
  id: string;
  user_id: string;
  team_id: string;
  team_name: string | null;
  access_token: string;
  bot_user_id: string | null;
  channel_id: string | null;
  channel_name: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const SlackService = {
  getAuthorizationUrl(userId: string): string {
    const clientId = config.slack.clientId;
    if (!clientId) {
      logger.warn("SLACK_CLIENT_ID is not configured in environment");
    }

    const redirectUri = encodeURIComponent(config.slack.redirectUri);
    const scope = encodeURIComponent("chat:write,channels:read,groups:read,incoming-webhook");
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString("base64");

    return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
  },

  async handleOAuthCallback(code: string, state: string): Promise<SlackIntegration> {
    let userId = "";
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
      userId = decoded.userId;
    } catch {
      throw new Error("Invalid OAuth state parameter");
    }

    const client = new WebClient();
    const response = await client.oauth.v2.access({
      client_id: config.slack.clientId,
      client_secret: config.slack.clientSecret,
      code,
      redirect_uri: config.slack.redirectUri,
    });

    if (!response.ok || !response.access_token) {
      throw new Error(`Slack OAuth exchange failed: ${response.error || "Unknown error"}`);
    }

    const teamId = (response.team as { id?: string })?.id || "unknown";
    const teamName = (response.team as { name?: string })?.name || null;
    const botUserId = (response.bot_user_id as string) || null;
    const channelId = (response.incoming_webhook as { channel_id?: string })?.channel_id || null;
    const channelName = (response.incoming_webhook as { channel?: string })?.channel || null;

    const res = await query<SlackIntegration>(
      `INSERT INTO slack_integrations (
         user_id, team_id, team_name, access_token, bot_user_id, channel_id, channel_name, is_active, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         team_id = EXCLUDED.team_id,
         team_name = EXCLUDED.team_name,
         access_token = EXCLUDED.access_token,
         bot_user_id = EXCLUDED.bot_user_id,
         channel_id = COALESCE(EXCLUDED.channel_id, slack_integrations.channel_id),
         channel_name = COALESCE(EXCLUDED.channel_name, slack_integrations.channel_name),
         is_active = TRUE,
         updated_at = NOW()
       RETURNING *`,
      [userId, teamId, teamName, response.access_token, botUserId, channelId, channelName]
    );

    logger.info("Slack workspace connected successfully", { teamName, userId });
    return res.rows[0]!;
  },

  async getIntegrationByUserId(userId: string): Promise<SlackIntegration | null> {
    const res = await query<SlackIntegration>(
      "SELECT * FROM slack_integrations WHERE user_id = $1 AND is_active = TRUE",
      [userId]
    );
    return res.rows[0] || null;
  },

  async disconnect(userId: string): Promise<boolean> {
    const res = await query(
      "UPDATE slack_integrations SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1",
      [userId]
    );
    return (res.rowCount ?? 0) > 0;
  },

  async sendRateLimitNotification(options: {
    userId?: string;
    senderEmail: string;
    limit: number;
    resetTime: Date;
    recipient?: string;
  }): Promise<boolean> {
    try {
      // Find active Slack integration for this user or any active integration
      let integration: SlackIntegration | null = null;
      if (options.userId) {
        integration = await this.getIntegrationByUserId(options.userId);
      }
      if (!integration) {
        const anyRes = await query<SlackIntegration>(
          "SELECT * FROM slack_integrations WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1"
        );
        integration = anyRes.rows[0] || null;
      }

      if (!integration || !integration.access_token) {
        logger.info("Slack notification skipped: No active Slack integration found.", {
          sender: options.senderEmail,
        });
        return false;
      }

      const client = new WebClient(integration.access_token);
      const targetChannel = integration.channel_id || "general";

      await client.chat.postMessage({
        channel: targetChannel,
        text: `⚠️ Rate limit reached for sender ${options.senderEmail}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "⚠️ ReachInbox Email Rate Limit Reached",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Sender Account:*\n\`${options.senderEmail}\``,
              },
              {
                type: "mrkdwn",
                text: `*Hourly Quota:*\n${options.limit} emails / hour`,
              },
              {
                type: "mrkdwn",
                text: `*Next Sending Window:*\n<!date^${Math.floor(options.resetTime.getTime() / 1000)}^{date_num} {time_secs}|${options.resetTime.toISOString()}>`,
              },
              {
                type: "mrkdwn",
                text: `*Action Taken:*\nJob safely rescheduled (no emails lost)`,
              },
            ],
          },
        ],
      });

      logger.info("Slack limit alert sent successfully", {
        channel: targetChannel,
        sender: options.senderEmail,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn("Could not deliver Slack rate-limit notification", { error: message });
      return false;
    }
  },
};
