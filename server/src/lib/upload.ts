import fs from "fs";
import multer from "multer";
import path from "path";

const uploadsRoot = path.resolve(__dirname, "../../uploads/gifts");

fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

export const giftImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Le fichier doit être une image."));
      return;
    }
    cb(null, true);
  },
});

export function giftImagePublicPath(filename: string): string {
  return `/uploads/gifts/${filename}`;
}
