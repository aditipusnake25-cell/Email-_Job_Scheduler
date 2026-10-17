import { Router } from "express";
import { SlackController } from "../controllers/slack.controller.js";
import { optionalAuth } from "../middleware/authenticate.js";

const router = Router();

router.get("/oauth/start", optionalAuth, SlackController.getAuthUrl);
router.get("/oauth/callback", SlackController.handleCallback);
router.get("/status", optionalAuth, SlackController.getStatus);
router.post("/disconnect", optionalAuth, SlackController.disconnect);
router.post("/test-alert", optionalAuth, SlackController.sendTestAlert);

export default router;
