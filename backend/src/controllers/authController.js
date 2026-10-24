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

    const cleanUsername = String(username).trim();

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.name, u.email, u.password_hash, u.role, u.must_change_password,
              p.id as personnel_id, p.team_group, p.rank_position, p.is_active
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.username = ?`,
      [cleanUsername]
    );

    if (users.length === 0) {
      return errorResponse(res, 'Kredensial tidak valid: Username atau password salah', 401);
    }

    const user = users[0];

    // Cegah login akun personel yang telah dinonaktifkan
    if (user.personnel_id && user.is_active === 0) {
      return errorResponse(res, 'Akses ditolak: Akun personel Anda telah dinonaktifkan dari sistem dinas', 403);
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Kredensial tidak valid: Username atau password salah', 401);
    }

    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

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
              p.birth_date, p.formal_education, p.cert_level, p.cert_number,
              p.cert_expiry_date, p.signature_url, p.team_group, p.employment_status
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return errorResponse(res, 'Pengguna tidak ditemukan', 404);
    }

    const user = users[0];
    const safeProfile = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      must_change_password: Boolean(user.must_change_password),
      created_at: user.created_at,
      personnel_id: user.personnel_id,
      nip: user.nip,
      full_name: user.full_name,
      rank_position: user.rank_position,
      birth_date: user.birth_date,
      formal_education: user.formal_education,
      team_group: user.team_group,
      cert_level: user.cert_level,
      cert_number: user.cert_number,
      cert_expiry_date: user.cert_expiry_date,
      signature_url: user.signature_url,
      employment_status: user.employment_status
    };

    return successResponse(res, 'Profil pengguna berhasil diambil', safeProfile);
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

export const updateProfile = async (req, res) => {
  try {
    const { nip, birth_date, formal_education, cert_level, cert_number, cert_expiry_date } = req.body;

    const [personnelRows] = await pool.query('SELECT * FROM personnel WHERE user_id = ?', [req.user.id]);
    if (personnelRows.length === 0) {
      return errorResponse(res, 'Data profil personel terkait akun tidak ditemukan', 404);
    }

    const pers = personnelRows[0];

    // Sanitasi cert_level ke nilai ENUM valid ('Basic', 'Junior', 'Senior')
    let sanitizedCertLevel = pers.cert_level;
    if (cert_level !== undefined && cert_level !== null) {
      const cl = String(cert_level);
      if (cl.includes('Senior')) sanitizedCertLevel = 'Senior';
      else if (cl.includes('Junior')) sanitizedCertLevel = 'Junior';
      else if (cl.includes('Basic')) sanitizedCertLevel = 'Basic';
      else sanitizedCertLevel = 'Basic';
    }

    // Sanitasi tanggal agar aman dari format invalid / empty string
    const parseDateOrNull = (val, fallback) => {
      if (val === undefined) return fallback;
      if (!val || String(val).trim() === '' || String(val).trim() === '-' || String(val).startsWith('0000')) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : String(val).split('T')[0];
    };

    const cleanBirthDate = parseDateOrNull(birth_date, pers.birth_date);
    const cleanExpiryDate = parseDateOrNull(cert_expiry_date, pers.cert_expiry_date);

    await pool.query(
      `UPDATE personnel SET
        nip = ?,
        birth_date = ?,
        formal_education = ?,
        cert_level = ?,
        cert_number = ?,
        cert_expiry_date = ?
      WHERE id = ?`,
      [
        nip !== undefined ? (nip ? String(nip).trim() : null) : pers.nip,
        cleanBirthDate,
        formal_education !== undefined ? (formal_education ? String(formal_education).trim() : null) : pers.formal_education,
        sanitizedCertLevel,
        cert_number !== undefined ? (cert_number ? String(cert_number).trim() : null) : pers.cert_number,
        cleanExpiryDate,
        pers.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM personnel WHERE id = ?', [pers.id]);
    return successResponse(res, 'Profil berhasil diperbarui', updated[0]);
  } catch (error) {
    console.error('Error updateProfile:', error);
    return errorResponse(res, 'Gagal memperbarui data profil: ' + error.message, 500);
  }
};

