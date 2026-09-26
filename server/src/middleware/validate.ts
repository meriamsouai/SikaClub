import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Certains champs sont invalides.",
        code: "VALIDATION",
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}
