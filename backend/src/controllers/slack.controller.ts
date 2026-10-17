import { Request, Response } from "express";
import { SlackService } from "../services/slack.service.js";
import { AuthenticatedRequest } from "../middleware/authenticate.js";
import { config } from "../config/env.js";

export const SlackController = {
  getAuthUrl(req: AuthenticatedRequest, res: Response): void {
    const userId = req.user?.id || (req.query.userId as string) || "demo-user";
    const authUrl = SlackService.getAuthorizationUrl(userId);

    res.json({
      success: true,
      authUrl,
      clientIdConfigured: Boolean(config.slack.clientId),
    });
  },

  async handleCallback(req: Request, res: Response): Promise<void> {
    const { code, state, error } = req.query;

    if (error) {
      res.redirect(`${config.frontendUrl}/dashboard?slack=error&message=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${config.frontendUrl}/dashboard?slack=error&message=missing_parameters`);
      return;
    }

    try {
      const integration = await SlackService.handleOAuthCallback(String(code), String(state));
      res.redirect(
        `${config.frontendUrl}/dashboard?slack=connected&team=${encodeURIComponent(integration.team_name || "workspace")}`
      );
    } catch (err) {
      res.redirect(
        `${config.frontendUrl}/dashboard?slack=error&message=${encodeURIComponent((err as Error).message)}`
      );
    }
  },

  async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      res.json({ success: true, connected: false });
      return;
    }

    const integration = await SlackService.getIntegrationByUserId(userId);

    res.json({
      success: true,
      connected: Boolean(integration && integration.is_active),
      integration: integration
        ? {
            teamName: integration.team_name,
            channelName: integration.channel_name,
            connectedAt: integration.created_at,
          }
        : null,
    });
  },

  async disconnect(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id || (req.body.userId as string);
    if (!userId) {
      res.status(400).json({ success: false, error: "User ID required" });
      return;
    }

    await SlackService.disconnect(userId);
    res.json({ success: true, message: "Slack disconnected successfully" });
  },

  async sendTestAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id || (req.body.userId as string);
    const senderEmail = (req.body.senderEmail as string) || "test-sender@reachinbox.test";

    const sent = await SlackService.sendRateLimitNotification({
      userId,
      senderEmail,
      limit: 200,
      resetTime: new Date(Date.now() + 3600000),
    });

    res.json({
      success: sent,
      message: sent
        ? "Test Slack alert delivered to connected channel"
        : "Could not send Slack alert (check if Slack is connected and credentials are valid)",
    });
  },
};
