import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MENU_UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "menu");

if (!fs.existsSync(MENU_UPLOAD_DIR)) {
  fs.mkdirSync(MENU_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MENU_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = /\.(png|jpe?g|webp)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error("Only PNG, JPG, and WEBP images are allowed"));
  }
}

export const uploadMenuImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
