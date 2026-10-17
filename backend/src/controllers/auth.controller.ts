import { Request, Response } from "express";
import passport from "passport";
import { generateUserToken } from "../integrations/googleOAuth.js";
import { UserModel, User } from "../models/User.js";
import { config } from "../config/env.js";
import { AuthenticatedRequest } from "../middleware/authenticate.js";

export const AuthController = {
  startGoogleAuth(req: Request, res: Response, next: any) {
    if (!config.auth.google.clientId || !config.auth.google.clientSecret) {
      res.status(503).json({
        success: false,
        error:
          "Google OAuth is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.",
        instructionsUrl: "https://console.cloud.google.com/apis/credentials",
      });
      return;
    }

    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })(req, res, next);
  },

  handleGoogleCallback(req: Request, res: Response) {
    const user = req.user as User;
    if (!user) {
      res.redirect(`${config.frontendUrl}/login?error=authentication_failed`);
      return;
    }

    const token = generateUserToken(user);

    // Set secure cookie and redirect to frontend with token
    res.cookie("token", token, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${config.frontendUrl}/dashboard?token=${token}`);
  },

  async devLogin(req: Request, res: Response): Promise<void> {
    const { email, name } = req.body;
    const userEmail = (email || "intern@reachinbox.ai").trim().toLowerCase();
    const userName = (name || "ReachInbox Demo User").trim();

    let user = await UserModel.findByEmail(userEmail);
    if (!user) {
      user = await UserModel.upsertGoogleUser({
        google_id: `dev-${Date.now()}`,
        email: userEmail,
        name: userName,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`,
      });
    }

    const token = generateUserToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user,
      message: "Authenticated successfully",
    });
  },

  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({
      success: true,
      user: req.user,
    });
  },

  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie("token");
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  },
};
