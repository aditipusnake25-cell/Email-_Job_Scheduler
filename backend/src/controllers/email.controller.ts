import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authenticate.js";
import { SchedulerService } from "../services/scheduler.service.js";
import { EmailModel } from "../models/Email.js";
import { SenderModel } from "../models/Sender.js";

export const EmailController = {
  async scheduleEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id || (req.body.userId as string);
    if (!userId) {
      res.status(401).json({ success: false, error: "User ID required" });
      return;
    }

    const {
      senderEmail,
      senderName,
      subject,
      body,
      recipients,
      startTime,
      delaySeconds,
      hourlyLimit,
      idempotencyKey,
      campaignName,
    } = req.body;

    if (!senderEmail || !subject || !body || !recipients) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: senderEmail, subject, body, recipients",
      });
      return;
    }

    // Support both array of strings and comma/newline separated string
    let recipientList: string[] = [];
    if (Array.isArray(recipients)) {
      recipientList = recipients.map((r) => String(r).trim());
    } else if (typeof recipients === "string") {
      recipientList = recipients
        .split(/[\r\n,]+/)
        .map((r) => r.trim())
        .filter(Boolean);
    }

    if (recipientList.length === 0) {
      res.status(400).json({
        success: false,
        error: "No valid recipient email addresses found.",
      });
      return;
    }

    const startAtDate = startTime ? new Date(startTime) : new Date();
    if (isNaN(startAtDate.getTime())) {
      res.status(400).json({
        success: false,
        error: "Invalid startTime format. Provide a valid ISO timestamp.",
      });
      return;
    }

    const parsedDelay = typeof delaySeconds === "number" ? Math.max(0, delaySeconds) : 2;
    const parsedLimit = typeof hourlyLimit === "number" ? Math.max(1, hourlyLimit) : 200;

    const result = await SchedulerService.scheduleBatch({
      userId,
      senderEmail,
      senderName,
      name: campaignName,
      subject,
      body,
      recipients: recipientList,
      startTime: startAtDate,
      delaySeconds: parsedDelay,
      hourlyLimit: parsedLimit,
      idempotencyKey: idempotencyKey || (req.headers["x-idempotency-key"] as string),
    });

    res.status(201).json({
      success: true,
      message: `Successfully scheduled ${result.emailsCount} email jobs.`,
      campaign: result.campaign,
      emailsCount: result.emailsCount,
      firstScheduledAt: result.firstScheduledAt,
      lastScheduledAt: result.lastScheduledAt,
    });
  },

  async getScheduledEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const data = await EmailModel.getScheduled({
      limit,
      offset,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      emails: data.emails,
      total: data.total,
      page,
      totalPages: Math.ceil(data.total / limit) || 1,
    });
  },

  async getSentEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const data = await EmailModel.getSent({
      limit,
      offset,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      emails: data.emails,
      total: data.total,
      page,
      totalPages: Math.ceil(data.total / limit) || 1,
    });
  },

  async getEmailById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = req.params.id as string;
    const email = await EmailModel.findById(id);

    if (!email) {
      res.status(404).json({ success: false, error: "Email record not found" });
      return;
    }

    res.json({ success: true, email });
  },

  async getSenders(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.json({ success: true, senders: [] });
      return;
    }

    const senders = await SenderModel.getByUserId(userId);
    res.json({ success: true, senders });
  },

  async createSender(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const { email, name, hourlyLimit, isDefault } = req.body;
    if (!email || !name) {
      res.status(400).json({ success: false, error: "Email and name are required" });
      return;
    }

    const sender = await SenderModel.create({
      userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      hourlyLimit: Number(hourlyLimit) || 200,
      isDefault: Boolean(isDefault),
    });

    res.status(201).json({ success: true, sender });
  },
};
