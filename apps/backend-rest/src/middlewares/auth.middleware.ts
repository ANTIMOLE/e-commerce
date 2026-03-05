import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, extractBearerToken } from "@ecommerce/shared";

// Extend Express Request type untuk tambah userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ success: false, error: "Token tidak ditemukan" });
    return;
  }

  try {
    const payload  = verifyAccessToken(token);
    req.userId     = payload.userId;
    req.userEmail  = payload.email;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token tidak valid atau sudah kadaluwarsa" });
  }
}
