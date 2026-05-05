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

    // RESEARCH DESIGN NOTE (B-04 — Bab III Metodologi Skripsi):
        // REST middleware selalu melakukan DB lookup (SELECT user by id) di setiap
        // authenticated request. Ini menambah 1 query DB per request dibandingkan
        // tRPC dengan AUTH_DB_VALIDATION=false (stateless JWT-only, default tRPC).
        // Implikasi benchmark: hasil latency REST untuk endpoint authenticated
        // mencakup overhead query ini. Untuk perbandingan equalized, jalankan tRPC
        // dengan AUTH_DB_VALIDATION=true (lihat apps/backend-trpc/.env.example).
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


// FIX [High]: optionalAuth sebelumnya memanggil authenticate() yang langsung kirim 401
// untuk token invalid/expired. Akibatnya user dengan cookie stale gagal buka halaman publik
// (mis. katalog produk). Fix: lakukan verifikasi inline dan silently skip jika token rusak,
// sehingga request tetap lanjut sebagai unauthenticated — bukan ditolak.
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies?.accessToken;

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where:  { id: decoded.userId },
      select: { id: true, role: true },
    });

    if (user) {
      req.user = {
        id:         user.id,
        role:       user.role as "USER" | "ADMIN",
        identifier: decoded.identifier,
      };
    }
  } catch {
    // Token invalid / expired — abaikan dan lanjut sebagai unauthenticated.
    // Jangan kirim 401 di sini; route ini memang opsional.
  }

  next();
};
