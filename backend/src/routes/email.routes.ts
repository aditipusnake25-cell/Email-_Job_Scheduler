import { Router } from "express";
import { EmailController } from "../controllers/email.controller.js";
import { requireAuth, optionalAuth } from "../middleware/authenticate.js";

const router = Router();

router.post("/schedule", optionalAuth, EmailController.scheduleEmails);
router.get("/scheduled", optionalAuth, EmailController.getScheduledEmails);
router.get("/sent", optionalAuth, EmailController.getSentEmails);
router.get("/senders", optionalAuth, EmailController.getSenders);
router.post("/senders", requireAuth, EmailController.createSender);
router.get("/:id", optionalAuth, EmailController.getEmailById);

export default router;
