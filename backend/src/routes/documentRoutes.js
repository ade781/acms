import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { errorResponse } from '../utils/responseHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

const router = Router();

/**
 * Route terproteksi untuk melihat / mengunduh dokumen pribadi personel.
 * Memeriksa token autentikasi JWT dan wewenang kepemilikan dokumen.
 */
router.get('/:id/view', requireAuth, async (req, res) => {
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
      return errorResponse(res, 'Dokumen tidak ditemukan', 404);
    }

    const doc = docRows[0];
    const currentUserRole = req.user.role;
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(currentUserRole);
    const isOwner = (req.user.personnel_id && Number(req.user.personnel_id) === Number(doc.personnel_id)) ||
                    (doc.user_id && Number(req.user.id) === Number(doc.user_id)) ||
                    (doc.uploaded_by && Number(req.user.id) === Number(doc.uploaded_by));

    if (!isLeadership && !isOwner) {
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat dokumen ini', 403);
    }

    const rawFileUrl = doc.file_url || '';
    const cleanFileName = path.basename(rawFileUrl);
    const filePath = path.resolve(uploadsDir, cleanFileName);

    if (!fs.existsSync(filePath)) {
      return errorResponse(res, 'Berkas fisik dokumen tidak ditemukan pada server', 404);
    }

    if (doc.mime_type) {
      res.setHeader('Content-Type', doc.mime_type);
    }
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name || cleanFileName}"`);

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error viewDocument:', error);
    return errorResponse(res, 'Gagal mengambil dokumen: ' + error.message, 500);
  }
});

router.get('/:id/download', requireAuth, async (req, res) => {
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
      return errorResponse(res, 'Dokumen tidak ditemukan', 404);
    }

    const doc = docRows[0];
    const currentUserRole = req.user.role;
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(currentUserRole);
    const isOwner = (req.user.personnel_id && Number(req.user.personnel_id) === Number(doc.personnel_id)) ||
                    (doc.user_id && Number(req.user.id) === Number(doc.user_id)) ||
                    (doc.uploaded_by && Number(req.user.id) === Number(doc.uploaded_by));

    if (!isLeadership && !isOwner) {
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk mengunduh dokumen ini', 403);
    }

    const rawFileUrl = doc.file_url || '';
    const cleanFileName = path.basename(rawFileUrl);
    const filePath = path.resolve(uploadsDir, cleanFileName);

    if (!fs.existsSync(filePath)) {
      return errorResponse(res, 'Berkas fisik dokumen tidak ditemukan pada server', 404);
    }

    return res.download(filePath, doc.file_name || cleanFileName);
  } catch (error) {
    console.error('Error downloadDocument:', error);
    return errorResponse(res, 'Gagal mengunduh dokumen: ' + error.message, 500);
  }
});

export default router;
