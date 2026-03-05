import jwt from "jsonwebtoken";
import type { JwtPayload, TokenPair } from "../types";

const ACCESS_SECRET  = process.env.JWT_SECRET         ?? "fallback_secret_change_this";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "fallback_refresh_secret_change_this";
const ACCESS_EXPIRY  = process.env.JWT_EXPIRY          ?? "1h";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY  ?? "7d";

export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY } as jwt.SignOptions);
}

export function signRefreshToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY } as jwt.SignOptions);
}

export function generateTokenPair(payload: Omit<JwtPayload, "iat" | "exp">): TokenPair {
  return {
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

// Extract token dari Authorization header "Bearer <token>"
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
