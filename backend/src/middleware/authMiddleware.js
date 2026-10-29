import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { errorResponse } from '../utils/responseHelper.js';

export const requireAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return errorResponse(res, 'Akses ditolak: Token autentikasi tidak ditemukan', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return errorResponse(res, 'Konfigurasi server internal tidak lengkap', 500);
    }

    const decoded = jwt.verify(token, secret);

    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.name, u.email, u.role, u.token_version, u.must_change_password, p.id as personnel_id, p.team_group
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Sesi tidak valid: Pengguna tidak ditemukan', 401);
    }

    const user = rows[0];

    // BUTIR TUGAS 5: Verifikasi token_version (Mekanisme Revokasi Token JWT)
    if (
      decoded.token_version !== undefined &&
      user.token_version !== undefined &&
      Number(decoded.token_version) !== Number(user.token_version)
    ) {
      return errorResponse(res, 'Sesi telah kedaluwarsa atau kata sandi telah diubah. Silakan masuk kembali.', 401);
    }

    // Penegakan Aktivasi Sandi Wajib (must_change_password)
    if (Boolean(user.must_change_password)) {
      const currentUrl = req.originalUrl || req.url || '';
      const allowedPaths = [
        '/api/auth/change-password',
        '/api/auth/logout',
        '/api/auth/me'
      ];
      const isAllowed = allowedPaths.some(p => currentUrl.startsWith(p));
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Akses dibatasi: Anda wajib mengganti kata sandi awal terlebih dahulu sebelum mengakses sistem operasional.'
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token autentikasi telah kedaluwarsa', 401);
    }
    return errorResponse(res, 'Token autentikasi tidak valid', 401);
  }
};

/**
 * BUTIR TUGAS 1: Middleware verifikasi akses berkas sensitif (/uploads/*)
 * Mendukung autentikasi fleksibel: membaca dari header 'Authorization: Bearer <token>'
 * maupun query string '?token=...' (sesuai aturan GEMINI.md Butir 16)
 */
export const verifyUploadAccess = requireAuth;
