import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

export class AppError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message, code: err.code });
    return;
  }

  console.error(err);
  res.status(500).json({
    message: "Une erreur interne est survenue.",
    code: "INTERNAL",
    ...(env.isProduction ? {} : { detail: err instanceof Error ? err.message : "Unknown error" }),
  });
}
