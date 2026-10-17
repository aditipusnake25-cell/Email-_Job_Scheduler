import nodemailer from "nodemailer";
import type { Transporter, TestAccount } from "nodemailer";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

let transporter: Transporter | null = null;
let cachedAccount: TestAccount | null = null;

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
}

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  let user = config.smtp.etherealUser;
  let pass = config.smtp.etherealPass;

  // Auto-generate test account if none provided in environment
  if (!user || !pass) {
    if (!cachedAccount) {
      logger.info("Generating new Ethereal test account for SMTP delivery...");
      cachedAccount = await nodemailer.createTestAccount();
      logger.info("Ethereal test account created successfully", {
        user: cachedAccount.user,
        smtpServer: cachedAccount.smtp.host,
      });
    }
    user = cachedAccount.user;
    pass = cachedAccount.pass;
  }

  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export const EmailService = {
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const mailer = await getTransporter();

      const info = await mailer.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        text: options.body,
        html: options.body.replace(/\n/g, "<br/>"),
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

      logger.info("Email delivered via Ethereal SMTP", {
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
        previewUrl,
      });

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Failed to send email via Ethereal SMTP", { error: message, to: options.to });
      return {
        success: false,
        error: message,
      };
    }
  },

  async verifySmtp(): Promise<{ ready: boolean; error?: string }> {
    try {
      const mailer = await getTransporter();
      await mailer.verify();
      return { ready: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ready: false, error: message };
    }
  },
};
