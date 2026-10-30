import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

/**
 * Middleware pengaman akses /uploads untuk berkas privat (dokumen kepegawaian & tanda tangan digital).
 * Berkas operasional publik (foto inspeksi armada, foto insiden, edaran pengumuman) dialirkan langsung.
 */
export const protectPrivateUploads = async (req, res, next) => {
  const filename = path.basename(req.path);
  if (!filename || filename === '.' || filename === '/') {
    return next();
  }

  // Tentukan apakah file tergolong privat/sensitif (dokumen personel, bukti cuti, tanda tangan digital)
  const isPrivateDoc = filename.startsWith('document-') ||
                       filename.startsWith('signature-') ||
                       (filename.toLowerCase().endsWith('.pdf') && !filename.startsWith('announcement-') && !filename.startsWith('file-'));

  // Berkas operasional publik (foto inspeksi armada, foto insiden, edaran pengumuman)
  if (!isPrivateDoc) {
    const publicFilePath = path.resolve(uploadsDir, filename);
    if (fs.existsSync(publicFilePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.sendFile(publicFilePath);
    }
    return next();
  }

  // --- BERKAS PRIVAT: WAJIB TERAUTENTIKASI & TEROTORISASI ---
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak: Berkas ini bersifat rahasia dan memerlukan autentikasi login'
      });
    }

    const secret = process.env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Token autentikasi tidak valid atau telah kedaluwarsa'
      });
    }

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.role, p.id as personnel_id
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Sesi tidak valid: Pengguna tidak ditemukan'
      });
    }

    const user = users[0];
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user.role);

    if (filename.startsWith('signature-')) {
      if (!isLeadership) {
        const [sigOwner] = await pool.query(
          'SELECT id FROM personnel WHERE signature_url LIKE ? AND (id = ? OR user_id = ?)',
          [`%${filename}`, user.personnel_id || 0, user.id]
        );
        if (sigOwner.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengakses tanda tangan ini'
          });
        }
      }
    } else {
      if (!isLeadership) {
        const [docRows] = await pool.query(
          `SELECT pd.id, pd.personnel_id, pd.uploaded_by, p.user_id
           FROM personnel_documents pd
           LEFT JOIN personnel p ON p.id = pd.personnel_id
           WHERE pd.file_name = ? OR pd.file_url = ?`,
          [filename, `/uploads/${filename}`]
        );

        if (docRows.length > 0) {
          const doc = docRows[0];
          const isOwner = (user.personnel_id && Number(user.personnel_id) === Number(doc.personnel_id)) ||
                          (doc.user_id && Number(user.id) === Number(doc.user_id)) ||
                          (doc.uploaded_by && Number(user.id) === Number(doc.uploaded_by));
          if (!isOwner) {
            return res.status(403).json({
              success: false,
              message: 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat dokumen kepegawaian ini'
            });
          }
        }
      }
    }

    const filePath = path.resolve(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Berkas tidak ditemukan pada server'
      });
    }

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving protected upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses permintaan akses berkas'
    });
  }
};

export default protectPrivateUploads;
