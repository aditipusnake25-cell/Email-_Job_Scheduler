import dotenv from "dotenv";
import path from "path";

// Load environment variables from backend/.env
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  // PostgreSQL (Neon)
  database: {
    url: process.env.DATABASE_URL || "",
    ssl: process.env.DATABASE_SSL === "true",
  },

  // Redis (Upstash or local)
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  // BullMQ & Rate Limiter Defaults
  queue: {
    name: "email-queue",
    workerConcurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
    emailDelayMs: Number(process.env.EMAIL_DELAY_MS) || 2000,
    maxEmailsPerHourPerSender: Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER) || 200,
  },

  // Security & Authentication
  auth: {
    sessionSecret: process.env.SESSION_SECRET || "reachinbox-scheduler-session-secret-key-2026",
    jwtSecret: process.env.JWT_SECRET || "reachinbox-scheduler-jwt-secret-key-min-32-chars!",
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
    },
  },

  // Slack Integration
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || "",
    clientSecret: process.env.SLACK_CLIENT_SECRET || "",
    signingSecret: process.env.SLACK_SIGNING_SECRET || "",
    redirectUri: process.env.SLACK_REDIRECT_URI || "http://localhost:5000/api/slack/oauth/callback",
  },

  // SMTP (Ethereal test email)
  smtp: {
    etherealUser: process.env.ETHEREAL_USER || "",
    etherealPass: process.env.ETHEREAL_PASS || "",
  },

  // Elasticsearch
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || "http://localhost:9200",
    index: process.env.ELASTICSEARCH_INDEX || "emails",
  },
};
