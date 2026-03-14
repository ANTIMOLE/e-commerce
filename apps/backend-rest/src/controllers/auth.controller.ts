import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import * as authService from "../services/auth.service";
import { env } from "src/config/env";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

// ============================================================
// POST /auth/register
// ============================================================
export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body);

    // Set cookies
    res.cookie("accessToken",  accessToken,  { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });        // 1 jam
    res.cookie("refreshToken", refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 hari

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil.",
      data:    user,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// POST /auth/login
// ============================================================
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);

    res.cookie("accessToken",  accessToken,  { ...COOKIE_OPTIONS, maxAge: 60 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({
      success: true,
      message: "Login berhasil.",
      data:    user,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// POST /auth/logout
// ============================================================
export async function logoutController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await authService.logout(req.user!.id);

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ success: true, message: "Logout berhasil." });
  } catch (error) {
    next(error);
  }
}

/**
 * TODO:
 * 1. Ambil oldPassword dan newPassword dari req.body
 * 2. Ambil userId dari req.user.id (sudah di-attach oleh authenticate middleware)
 * 3. Panggil authService.changePassword(userId, oldPassword, newPassword)
 * 4. Return response success
 *
 * HINT: Lihat loginController di atas — pattern try/catch/next sama persis
 */
export async function changePasswordController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // TODO: implementasi di sini
  try{
    const { oldPassword, newPassword } = req.body;
    const userId = req.user!.id;
    await authService.changePassword(userId, oldPassword, newPassword);

    res.json({ success: true, message: "Password berhasil diubah." });

  }catch(error){
    next(error);
  }
}

/**
 * TODO:
 * 1. Ambil userId dari req.user.id
 * 2. Panggil authService.getProfile(userId)
 * 3. Return data profile di response
 *
 * HINT: Lihat logoutController — cara ambil req.user.id sama
 */
export async function getProfileController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // TODO: implementasi di sini
  try{
    const userId = req.user!.id;
    const profile = await authService.getProfile(userId);

    res.json({ success: true, data: profile });
  }catch(error){
    next(error);
  }
}

// auth.controller.ts
export async function getMeController(req: AuthRequest, res: Response) {
  res.json({ success: true, data: req.user });
}

export async function refreshTokenController(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: "Refresh token tidak ditemukan." });
      return;
    }

    const accessToken = await authService.refreshToken(token);
    res.cookie("accessToken", accessToken, { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 1000 });
    res.json({ success: true, message: "Token diperbarui." });
  } catch (error) {
    next(error);
  }
}