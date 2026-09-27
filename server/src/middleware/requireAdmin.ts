import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";
import { asyncHandler } from "../lib/asyncHandler";
import { isStaffRole } from "../models/User";

export const requireAdmin = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.authUser || !isStaffRole(req.authUser.role)) {
    throw new AppError(403, "Accès administrateur requis.", "FORBIDDEN");
  }
  next();
});

export const requireSuperAdmin = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.authUser || req.authUser.role !== "super_admin") {
    throw new AppError(403, "Accès super administrateur requis.", "FORBIDDEN");
  }
  next();
});
