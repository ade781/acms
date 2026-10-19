import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return errorResponse(res, 'Username dan password wajib diisi', 400);
    }

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.name, u.email, u.password_hash, u.role, u.must_change_password,
              p.id as personnel_id, p.team_group, p.rank_position
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.username = ?`,
      [username]
    );

    if (users.length === 0) {
      return errorResponse(res, 'Kredensial tidak valid: Username atau password salah', 401);
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Kredensial tidak valid: Username atau password salah', 401);
    }

    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN;

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      secret,
      { expiresIn }
    );

    const safeUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      must_change_password: Boolean(user.must_change_password),
      personnel_id: user.personnel_id,
      team_group: user.team_group,
      rank_position: user.rank_position
    };

    return successResponse(res, 'Login berhasil', {
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Error login:', error);
    return errorResponse(res, 'Terjadi kesalahan pada server saat login', 500);
  }
};

export const getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.username, u.name, u.email, u.role, u.must_change_password, u.created_at,
              p.id as personnel_id, p.nip, p.full_name, p.rank_position,
              p.team_group, p.cert_level, p.employment_status
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return errorResponse(res, 'Pengguna tidak ditemukan', 404);
    }

    return successResponse(res, 'Profil pengguna berhasil diambil', {
      ...users[0],
      must_change_password: Boolean(users[0].must_change_password)
    });
  } catch (error) {
    console.error('Error getMe:', error);
    return errorResponse(res, 'Terjadi kesalahan saat mengambil data profil', 500);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return errorResponse(res, 'Password lama dan password baru wajib diisi', 400);
    }

    if (new_password.length < 6) {
      return errorResponse(res, 'Password baru minimal 6 karakter', 400);
    }

    if (new_password === '123456') {
      return errorResponse(res, 'Password baru tidak boleh menggunakan password default (123456)', 400);
    }

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return errorResponse(res, 'Pengguna tidak ditemukan', 404);
    }

    const isMatch = await bcrypt.compare(old_password, rows[0].password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Password lama tidak sesuai', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await pool.query('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [newHash, req.user.id]);

    return successResponse(res, 'Password berhasil diperbarui');
  } catch (error) {
    console.error('Error changePassword:', error);
    return errorResponse(res, 'Gagal memperbarui password', 500);
  }
};
