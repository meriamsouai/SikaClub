import fs from "fs";
import multer from "multer";
import path from "path";

const uploadsRoot = path.resolve(__dirname, "../../uploads/invoices");
fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`);
  },
});

export const MAX_INVOICE_FILES = 5;

export const invoiceFileUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: MAX_INVOICE_FILES },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf";
    if (!ok) {
      cb(new Error("Le fichier doit être une image ou un PDF."));
      return;
    }
    cb(null, true);
  },
});

export function invoiceFilePublicPath(filename: string): string {
  return `/uploads/invoices/${filename}`;
}
