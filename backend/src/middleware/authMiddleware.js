import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { errorResponse } from '../utils/responseHelper.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Akses ditolak: Token autentikasi tidak ditemukan', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    const decoded = jwt.verify(token, secret);

    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.name, u.email, u.role, p.id as personnel_id, p.team_group
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Sesi tidak valid: Pengguna tidak ditemukan', 401);
    }

    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token autentikasi telah kedaluwarsa', 401);
    }
    return errorResponse(res, 'Token autentikasi tidak valid', 401);
  }
};
