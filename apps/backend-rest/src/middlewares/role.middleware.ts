import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware";
import { AppError } from "./error.middleware";

// ============================================================
// Role Middleware — harus dipakai SETELAH authenticate
// ============================================================

/**
 * Require role tertentu.
 * Bisa pass single role atau array of roles.
 *
 * @example
 * router.get("/admin", authenticate, requireRole("ADMIN"), handler)
 * router.get("/both",  authenticate, requireRole(["USER", "ADMIN"]), handler)
 */
export const requireRole = (allowedRoles: "USER" | "ADMIN" | ("USER" | "ADMIN")[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke resource ini.",
      });
      return;
    }

    next();
  };
};

// ============================================================
// Shorthand helpers
// ============================================================

/** Hanya ADMIN yang boleh akses */
export const requireAdmin = requireRole("ADMIN");

/** USER dan ADMIN boleh akses */
export const requireUser = requireRole(["USER", "ADMIN"]);

// ============================================================
// Owner or Admin — akses resource milik sendiri atau admin
// ============================================================

/**
 * Izinkan akses jika user adalah owner resource atau ADMIN.
 *
 * @param getOwnerId Fungsi untuk mengambil userId dari request
 *
 * @example
 * router.get(
 *   "/orders/:id",
 *   authenticate,
 *   requireOwnerOrAdmin((req) => orderService.getOrderUserId(req.params.id)),
 *   handler
 * )
 */
export const requireOwnerOrAdmin = (
  getOwnerId: (req: AuthRequest) => string | Promise<string>
) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      // Admin bisa akses semua
      if (req.user.role === "ADMIN") {
        next();
        return;
      }

      const ownerId = await getOwnerId(req);

      if (req.user.id === ownerId) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke resource ini.",
      });
    } catch (error) {
      console.error("Authorization error:", error);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan saat verifikasi akses.",
      });
    }
  };
};