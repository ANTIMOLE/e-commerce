import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/database";

export interface AuthRequest extends Request {
  user?: {
    id:          string;
    role:        "USER" | "ADMIN";
    identifier?: string;
  };
}

interface JwtPayload {
  userId:       string;
  role:         "USER" | "ADMIN";
  identifier?:  string;
}


export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ambil token dari httpOnly cookie
    const token = req.cookies?.accessToken;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Token tidak ditemukan. Silakan login terlebih dahulu.",
      });
      return;
    }

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: "Token telah kadaluarsa. Silakan login kembali.",
        });
        return;
      }
      res.status(401).json({
        success: false,
        message: "Token tidak valid.",
      });
      return;
    }

    // Pastikan user masih ada di database
    const user = await prisma.user.findUnique({
      where:  { id: decoded.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User tidak ditemukan.",
      });
      return;
    }

    // Attach user ke request
    req.user = {
      id:         user.id,
      role:       user.role as "USER" | "ADMIN",
      identifier: decoded.identifier,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat verifikasi token.",
    });
  }
};


export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.cookies?.accessToken) {
    next();
    return;
  }

  try {
    await authenticate(req, res, next);
  } catch {
    next();
  }
};