import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Pemetaan MIME type resmi ke ekstensi aman baku
const MIME_TO_SAFE_EXT = {
  'image/webp': '.webp',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitasi field name agar tidak mengandung karakter path traversal
    const safeField = (file.fieldname || 'upload').replace(/[^a-zA-Z0-9_-]/g, '') || 'file';
    // Gunakan ekstensi canonical berdasarkan MIME type yang telah divalidasi
    const safeExt = MIME_TO_SAFE_EXT[file.mimetype] || '.bin';
    const uuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeField}-${Date.now()}-${uuid}${safeExt}`);
  }
});

export const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/webp', 'image/jpeg', 'image/png', 'image/jpg'];
  const allowedExts = ['.webp', '.jpg', '.jpeg', '.png'];

  const rawExt = path.extname(file.originalname || '').toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(rawExt)) {
    cb(null, true);
  } else {
    cb(new Error('Format berkas gambar tidak didukung. Harap unggah berkas gambar sah (WebP/JPEG/PNG).'), false);
  }
};

export const documentFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/webp',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];
  const allowedExts = ['.pdf', '.webp', '.jpg', '.jpeg', '.png'];

  const rawExt = path.extname(file.originalname || '').toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(rawExt)) {
    cb(null, true);
  } else {
    cb(new Error('Format dokumen tidak didukung. Harap unggah dokumen PDF atau gambar sah (JPEG/PNG/WebP).'), false);
  }
};

export const uploadSingleImage = (fieldName = 'photo') => {
  return multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  }).single(fieldName);
};

export const uploadMultipleImages = (fieldName = 'photos', maxCount = 5) => {
  return multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: maxCount }
  }).array(fieldName, maxCount);
};

export const uploadSingleDocument = (fieldName = 'document') => {
  return multer({
    storage,
    fileFilter: documentFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  }).single(fieldName);
};

