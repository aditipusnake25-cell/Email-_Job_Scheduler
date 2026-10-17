import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { config } from "./config/env.js";
import { initializePassport } from "./integrations/googleOAuth.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import emailRoutes from "./routes/email.routes.js";
import slackRoutes from "./routes/slack.routes.js";
import searchRoutes from "./routes/search.routes.js";
import queueRoutes from "./routes/queue.routes.js";
import { bullBoardRouter } from "./integrations/bullBoard.js";

const app = express();

// Security and parser middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost and specified frontend url
      if (!origin || origin.startsWith("http://localhost:") || origin === config.frontendUrl) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Passport OAuth initialization
initializePassport();
app.use(passport.initialize());

// Operational Bull Board UI for queue monitoring
app.use("/admin/queues", bullBoardRouter);

// Application API routes
app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/slack", slackRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/queue", queueRoutes);

// Health check endpoints
app.get("/", (_req, res) => {
  res.json({
    message: "ReachInbox Email Job Scheduler API",
    status: "online",
    docs: "/api/queue/health",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
