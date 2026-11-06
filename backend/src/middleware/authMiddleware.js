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
      // Batasi penerimaan req.query.token untuk path pratinjau inline/pdf, berkas dokumen, dan unduhan lampiran
      const currentUrl = req.originalUrl || req.url || '';
      const isQueryTokenAllowed =
        currentUrl.includes('/pdf') ||
        currentUrl.includes('/download') ||
        currentUrl.includes('/view') ||
        currentUrl.includes('/attachment') ||
        currentUrl.startsWith('/api/documents/') ||
        currentUrl.startsWith('/api/reports/') ||
        currentUrl.startsWith('/api/personnel/export/pdf');
      if (isQueryTokenAllowed) {
        token = req.query.token;
      }
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
      `SELECT u.id, u.username, u.name, u.email, u.role, u.token_version, u.must_change_password,
              p.id as personnel_id, p.team_group, p.is_active
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Sesi tidak valid: Pengguna tidak ditemukan', 401);
    }

    const user = rows[0];

    // Validasi akun personel aktif: jika dinonaktifkan (is_active === 0), tolak akses
    if (user.personnel_id && user.is_active === 0) {
      return res.status(403).json({
        success: false,
        code: 'INACTIVE_ACCOUNT',
        message: 'Akses ditolak: Akun personel Anda telah dinonaktifkan dari sistem dinas.'
      });
    }

    // Validasi token_version dibuat Fail-Closed: tolak jika decodedVersion !== user.token_version
    const decodedVersion = Number(decoded.token_version || 0);
    const userVersion = Number(user.token_version || 0);
    if (decodedVersion !== userVersion) {
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
 * Optional Authentication Middleware
 * Memeriksa token jika disertakan, namun tidak memblokir request jika token tidak ada atau kedaluwarsa.
 * Sangat ideal untuk endpoint seperti /logout agar proses keluar sesi tidak memicu 401 berulang.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return next();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return next();

    const decoded = jwt.verify(token, secret);

    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.name, u.email, u.role, u.token_version, u.must_change_password,
              p.id as personnel_id, p.team_group, p.is_active
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const decodedVersion = Number(decoded.token_version || 0);
      const userVersion = Number(user.token_version || 0);
      if (decodedVersion === userVersion) {
        req.user = user;
      }
    }
    next();
  } catch {
    // Abaikan kegagalan token pada optionalAuth
    next();
  }
};
