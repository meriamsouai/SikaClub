import type { CookieOptions, Response } from "express";
import { env } from "../config/env";
import { ACCESS_COOKIE, ACCESS_MAX_AGE_MS, REFRESH_COOKIE, REFRESH_MAX_AGE_MS } from "./tokens";

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    // "none" is required when frontend (Vercel) and API (Render) are on different domains
    sameSite: env.isProduction ? "none" : "lax",
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseOptions(),
    path: "/api",
    maxAge: ACCESS_MAX_AGE_MS,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseOptions(),
    path: "/api/auth",
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: "/api" });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: "/api/auth" });
}
