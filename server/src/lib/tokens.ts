import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "../models/User";

export const ACCESS_COOKIE = "sika_access";
export const REFRESH_COOKIE = "sika_refresh";
export const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function signAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ sub: userId, role }, env.jwtAccessSecret, {
    expiresIn: ACCESS_MAX_AGE_MS / 1000,
  });
}

export function verifyAccessToken(token: string): { sub: string; role: UserRole } {
  const decoded = jwt.verify(token, env.jwtAccessSecret);
  if (typeof decoded === "string" || !decoded.sub || typeof decoded.sub !== "string") {
    throw new Error("Invalid access token");
  }
  return { sub: decoded.sub, role: decoded.role as UserRole };
}

export function createRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_MS),
  };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
