import { Router } from "express";
import passport from "passport";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/authenticate.js";

const router = Router();

router.get("/google", AuthController.startGoogleAuth);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login?error=oauth_failed" }),
  AuthController.handleGoogleCallback
);

router.post("/dev-login", AuthController.devLogin);
router.get("/me", requireAuth, AuthController.getCurrentUser);
router.post("/logout", AuthController.logout);

export default router;
