import type { NextFunction, Request, Response } from "express";
import { UserModel } from "../models/User";
import { ACCESS_COOKIE, verifyAccessToken } from "../lib/tokens";
import { AppError } from "./errorHandler";
import { asyncHandler } from "../lib/asyncHandler";

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
  if (!token) {
    throw new AppError(401, "Authentification requise.", "UNAUTHENTICATED");
  }

  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    throw new AppError(401, "Session expirée. Veuillez vous reconnecter.", "UNAUTHENTICATED");
  }

  const user = await UserModel.findById(userId);
  if (!user || user.status !== "approved") {
    throw new AppError(401, "Session invalide.", "UNAUTHENTICATED");
  }

  req.authUser = user;
  next();
});
