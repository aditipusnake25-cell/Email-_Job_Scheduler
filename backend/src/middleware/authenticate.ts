import { Request, Response, NextFunction } from "express";
import { verifyUserToken } from "../integrations/googleOAuth.js";
import { UserModel, User } from "../models/User.js";

declare global {
  namespace Express {
    interface User {
      id: string;
      google_id: string | null;
      name: string;
      email: string;
      avatar_url: string | null;
      created_at: Date;
      updated_at: Date;
    }
  }
}

export type AuthenticatedRequest = Request;

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if ((req as any).cookies?.token) {
    token = (req as any).cookies.token;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please log in.",
    });
    return;
  }

  const payload = verifyUserToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired session. Please log in again.",
    });
    return;
  }

  const user = await UserModel.findById(payload.userId);
  if (!user) {
    res.status(401).json({
      success: false,
      error: "User account not found.",
    });
    return;
  }

  req.user = user;
  next();
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if ((req as any).cookies?.token) {
    token = (req as any).cookies.token;
  }

  if (token) {
    const payload = verifyUserToken(token);
    if (payload) {
      const user = await UserModel.findById(payload.userId);
      if (user) {
        req.user = user;
      }
    }
  }

  next();
}
