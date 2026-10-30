import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { errorResponse } from '../utils/responseHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

// Helper pemetaan MIME type berdasarkan ekstensi berkas
const EXT_TO_MIME = {
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/**
 * Controller terproteksi untuk melihat dokumen personel (Inline Browser Preview).
 * Mendukung autentikasi via header Authorization: Bearer <token> maupun query param ?token=<jwt>.
 */
export const viewDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const [docRows] = await pool.query(
      `SELECT pd.*, p.user_id, p.full_name
       FROM personnel_documents pd
       LEFT JOIN personnel p ON p.id = pd.personnel_id
       WHERE pd.id = ?`,
      [id]
    );

    if (docRows.length === 0) {
      return errorResponse(res, 'Dokumen kepegawaian tidak ditemukan', 404);
    }

    const doc = docRows[0];
    const currentUserRole = req.user.role;
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor', 'operation_chief'].includes(currentUserRole);
    const isOwner = (req.user.personnel_id && Number(req.user.personnel_id) === Number(doc.personnel_id)) ||
                    (doc.user_id && Number(req.user.id) === Number(doc.user_id)) ||
                    (doc.uploaded_by && Number(req.user.id) === Number(doc.uploaded_by));

    if (!isLeadership && !isOwner) {
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat berkas ini', 403);
    }

    const rawFileUrl = doc.file_url || '';
    const cleanFileName = path.basename(rawFileUrl.replace(/\\/g, '/'));
    const filePath = path.resolve(uploadsDir, cleanFileName);

    if (!cleanFileName || cleanFileName === '.' || cleanFileName === '..' || cleanFileName.includes('..') || !filePath.startsWith(uploadsDir + path.sep)) {
      return errorResponse(res, 'Akses berkas tidak sah: Deteksi path traversal', 400);
    }

    if (!fs.existsSync(filePath)) {
      return errorResponse(res, `Berkas fisik dokumen (${cleanFileName}) tidak ditemukan pada disk server`, 404);
    }

    const ext = path.extname(cleanFileName).toLowerCase();
    const contentType = (doc.mime_type && doc.mime_type !== 'application/octet-stream')
      ? doc.mime_type
      : (EXT_TO_MIME[ext] || 'application/pdf');

    const downloadName = doc.file_name || cleanFileName;
    const safeAsciiName = downloadName.replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`);

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error viewDocument:', error);
    return errorResponse(res, 'Gagal mengambil dokumen: ' + error.message, 500);
  }
};

/**
 * Controller terproteksi untuk mengunduh dokumen personel sebagai lampiran berkas (Attachment Download).
 */
export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const [docRows] = await pool.query(
      `SELECT pd.*, p.user_id
       FROM personnel_documents pd
       LEFT JOIN personnel p ON p.id = pd.personnel_id
       WHERE pd.id = ?`,
      [id]
    );

    if (docRows.length === 0) {
      return errorResponse(res, 'Dokumen kepegawaian tidak ditemukan', 404);
    }

    const doc = docRows[0];
    const currentUserRole = req.user.role;
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor', 'operation_chief'].includes(currentUserRole);
    const isOwner = (req.user.personnel_id && Number(req.user.personnel_id) === Number(doc.personnel_id)) ||
                    (doc.user_id && Number(req.user.id) === Number(doc.user_id)) ||
                    (doc.uploaded_by && Number(req.user.id) === Number(doc.uploaded_by));

    if (!isLeadership && !isOwner) {
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk mengunduh berkas ini', 403);
    }

    const rawFileUrl = doc.file_url || '';
    const cleanFileName = path.basename(rawFileUrl.replace(/\\/g, '/'));
    const filePath = path.resolve(uploadsDir, cleanFileName);

    if (!cleanFileName || cleanFileName === '.' || cleanFileName === '..' || cleanFileName.includes('..') || !filePath.startsWith(uploadsDir + path.sep)) {
      return errorResponse(res, 'Akses berkas tidak sah: Deteksi path traversal', 400);
    }

    if (!fs.existsSync(filePath)) {
      return errorResponse(res, `Berkas fisik dokumen (${cleanFileName}) tidak ditemukan pada disk server`, 404);
    }

    const downloadName = doc.file_name || cleanFileName;
    return res.download(filePath, downloadName);
  } catch (error) {
    console.error('Error downloadDocument:', error);
    return errorResponse(res, 'Gagal mengunduh dokumen: ' + error.message, 500);
  }
};

/**
 * Controller terproteksi untuk pratinjau spesimen tanda tangan digital personel.
 */
export const viewSignature = async (req, res) => {
  try {
    const { personnelId } = req.params;

    const [rows] = await pool.query(
      `SELECT p.id, p.user_id, p.signature_url, p.full_name
       FROM personnel p
       WHERE p.id = ?`,
      [personnelId]
    );

    if (rows.length === 0 || !rows[0].signature_url) {
      return errorResponse(res, 'Spesimen tanda tangan digital tidak ditemukan', 404);
    }

    const pers = rows[0];
    const currentUserRole = req.user.role;
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor', 'operation_chief'].includes(currentUserRole);
    const isOwner = (req.user.personnel_id && Number(req.user.personnel_id) === Number(pers.id)) ||
                    (pers.user_id && Number(req.user.id) === Number(pers.user_id));

    if (!isLeadership && !isOwner) {
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat tanda tangan ini', 403);
    }

    const cleanFileName = path.basename(String(pers.signature_url || '').replace(/\\/g, '/'));
    const filePath = path.resolve(uploadsDir, cleanFileName);

    if (!cleanFileName || cleanFileName === '.' || cleanFileName === '..' || cleanFileName.includes('..') || !filePath.startsWith(uploadsDir + path.sep)) {
      return errorResponse(res, 'Akses berkas tidak sah: Deteksi path traversal', 400);
    }

    if (!fs.existsSync(filePath)) {
      return errorResponse(res, `Berkas fisik spesimen tanda tangan (${cleanFileName}) tidak ditemukan`, 404);
    }

    const ext = path.extname(cleanFileName).toLowerCase();
    res.setHeader('Content-Type', EXT_TO_MIME[ext] || 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="${cleanFileName}"`);

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error viewSignature:', error);
    return errorResponse(res, 'Gagal mengambil spesimen tanda tangan: ' + error.message, 500);
  }
};
