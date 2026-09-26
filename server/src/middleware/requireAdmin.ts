import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";
import { asyncHandler } from "../lib/asyncHandler";

export const requireAdmin = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.authUser || req.authUser.role !== "admin") {
    throw new AppError(403, "Accès administrateur requis.", "FORBIDDEN");
  }
  next();
});
