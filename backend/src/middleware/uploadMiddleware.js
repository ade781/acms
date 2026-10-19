import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.webp';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/webp', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Harap unggah berkas gambar (WebP/JPEG/PNG).'), false);
  }
};

export const uploadSingleImage = (fieldName = 'photo') => {
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  }).single(fieldName);
};

export const uploadMultipleImages = (fieldName = 'photos', maxCount = 5) => {
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
  }).array(fieldName, maxCount);
};
