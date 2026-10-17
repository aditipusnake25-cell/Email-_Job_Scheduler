import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { UserModel, User } from "../models/User.js";
import { logger } from "../utils/logger.js";

export function initializePassport(): void {
  if (config.auth.google.clientId && config.auth.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.auth.google.clientId,
          clientSecret: config.auth.google.clientSecret,
          callbackURL: config.auth.google.callbackUrl,
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email returned from Google profile"));
            }

            const name = profile.displayName || profile.name?.givenName || "Google User";
            const avatarUrl = profile.photos?.[0]?.value || null;

            const user = await UserModel.upsertGoogleUser({
              google_id: profile.id,
              name,
              email,
              avatar_url: avatarUrl || undefined,
            });

            logger.info("User authenticated via Google OAuth", { email: user.email, id: user.id });
            return done(null, user);
          } catch (err) {
            logger.error("Error in Google OAuth strategy callback", err);
            return done(err as Error);
          }
        }
      )
    );
  } else {
    logger.warn(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set in environment. Google OAuth is ready once credentials are provided."
    );
  }
}

export function generateUserToken(user: { id: string; email: string; name: string; avatar_url?: string | null }): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
    },
    config.auth.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function verifyUserToken(token: string): { userId: string; email: string; name: string } | null {
  try {
    return jwt.verify(token, config.auth.jwtSecret) as { userId: string; email: string; name: string };
  } catch {
    return null;
  }
}
