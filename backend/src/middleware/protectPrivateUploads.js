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
  // 1. Sanitasi dan proteksi dari serangan Path Traversal
  let rawPath = req.path || '';
  try {
    rawPath = decodeURIComponent(rawPath);
  } catch {
    return res.status(400).json({
      success: false,
      message: 'Akses ditolak: Format URL tidak valid'
    });
  }

  // Normalisasi pemisah path untuk deteksi lintas platform (Windows & Linux)
  const normalizedPath = rawPath.replace(/\\/g, '/');

  // Deteksi dini karakter null-byte atau traversal eksplisit
  if (normalizedPath.includes('\0') || normalizedPath.includes('..') || rawPath.includes('..')) {
    return res.status(400).json({
      success: false,
      message: 'Akses ditolak: Pola path tidak valid atau terdeteksi traversal ilegal'
    });
  }

  const filename = path.basename(normalizedPath);
  if (!filename || filename === '.' || filename === '..' || filename === '/') {
    return next();
  }

  // Strict Jail Check: Pastikan path absolut berkas tetap berada di dalam direktori uploads
  const targetFilePath = path.resolve(uploadsDir, filename);
  if (!targetFilePath.startsWith(uploadsDir + path.sep)) {
    return res.status(400).json({
      success: false,
      message: 'Akses ditolak: Upaya akses direktori di luar batas yang diizinkan'
    });
  }

  // Tentukan apakah file tergolong privat/sensitif (dokumen personel, bukti cuti, tanda tangan digital)
  const isPrivateDoc = filename.startsWith('document-') ||
                       filename.startsWith('signature-') ||
                       (filename.toLowerCase().endsWith('.pdf') && !filename.startsWith('announcement-') && !filename.startsWith('file-'));

  // Berkas operasional publik (foto inspeksi armada, foto insiden, edaran pengumuman)
  if (!isPrivateDoc) {
    if (fs.existsSync(targetFilePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.sendFile(targetFilePath);
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
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.name === 'TokenExpiredError'
          ? 'Token autentikasi telah kedaluwarsa'
          : 'Token autentikasi tidak valid atau telah kedaluwarsa'
      });
    }

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.role, u.token_version, u.must_change_password, p.id as personnel_id
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

    // Verifikasi token_version (Mekanisme Revokasi Token JWT)
    if (
      decoded.token_version !== undefined &&
      user.token_version !== undefined &&
      Number(decoded.token_version) !== Number(user.token_version)
    ) {
      return res.status(401).json({
        success: false,
        message: 'Sesi telah kedaluwarsa atau kata sandi telah diubah. Silakan masuk kembali.'
      });
    }

    // Penegakan Aktivasi Sandi Wajib (must_change_password)
    if (Boolean(user.must_change_password)) {
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Akses dibatasi: Anda wajib mengganti kata sandi awal terlebih dahulu sebelum mengakses sistem operasional.'
      });
    }
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor', 'operation_chief'].includes(user.role);

    if (filename.startsWith('signature-')) {
      if (!isLeadership) {
        // Izinkan jika tanda tangan milik pengguna sendiri ATAU tanda tangan resmi Section Head / Dept Head / Chief aktif
        const [allowedSigs] = await pool.query(
          `SELECT 1 FROM personnel p
           LEFT JOIN users u ON u.id = p.user_id
           WHERE (p.signature_url LIKE ? OR u.signature_url LIKE ?)
             AND (
               p.id = ? OR p.user_id = ? OR u.id = ?
               OR u.role IN ('admin', 'dept_head', 'section_head', 'chief', 'supervisor', 'operation_chief')
               OR p.rank_position LIKE '%Section%Head%'
               OR p.rank_position LIKE '%Dept%Head%'
               OR p.rank_position LIKE '%Chief%'
               OR p.rank_position LIKE '%Ketua%'
             )
           UNION
           SELECT 1 FROM users u
           WHERE u.signature_url LIKE ?
             AND (
               u.id = ?
               OR u.role IN ('admin', 'dept_head', 'section_head', 'chief', 'supervisor', 'operation_chief')
             )
           LIMIT 1`,
          [
            `%${filename}`, `%${filename}`,
            user.personnel_id || 0, user.id, user.id,
            `%${filename}`,
            user.id
          ]
        );
        if (allowedSigs.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengakses tanda tangan ini'
          });
        }
      }
    } else {
      // Cek apakah berkas merupakan dokumen pemeliharaan/kendala armada operasional
      const [maintRows] = await pool.query(
        'SELECT id FROM vehicle_maintenance_records WHERE document_url LIKE ? OR document_name = ?',
        [`%${filename}`, filename]
      );
      if (maintRows.length > 0) {
        if (!fs.existsSync(targetFilePath)) {
          return res.status(404).json({
            success: false,
            message: 'Berkas tidak ditemukan pada server'
          });
        }
        res.setHeader('Content-Type', 'application/pdf');
        const dispositionType = req.query.download === '1' || req.query.download === 'true' ? 'attachment' : 'inline';
        res.setHeader('Content-Disposition', `${dispositionType}; filename="${filename}"`);
        return res.sendFile(targetFilePath);
      }

      if (!isLeadership) {
        const [docRows] = await pool.query(
          `SELECT pd.id, pd.personnel_id, pd.uploaded_by, p.user_id
           FROM personnel_documents pd
           LEFT JOIN personnel p ON p.id = pd.personnel_id
           WHERE pd.file_name = ? OR pd.file_url = ? OR pd.file_url LIKE ?`,
          [filename, `/uploads/${filename}`, `%${filename}`]
        );

        // Prinsip Default-Deny (Fail-Closed): Jika dokumen tidak ditemukan atau bukan milik pengguna, tolak akses!
        if (docRows.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat dokumen kepegawaian ini'
          });
        }

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

    if (!fs.existsSync(targetFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'Berkas tidak ditemukan pada server'
      });
    }

    return res.sendFile(targetFilePath);
  } catch (error) {
    console.error('Error serving protected upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses permintaan akses berkas'
    });
  }
};

export default protectPrivateUploads;
