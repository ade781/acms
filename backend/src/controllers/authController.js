import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';
import { sanitizeAndValidateCompetencies, parseCompetenciesArray } from '../utils/competencyHelper.js';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return errorResponse(res, 'Username dan password wajib diisi', 400);
    }

    const cleanUsername = String(username).trim();

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.name, u.email, u.password_hash, u.role, u.must_change_password, u.token_version,
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
        role: user.role,
        token_version: user.token_version || 1
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
              p.id as personnel_id, p.*
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return errorResponse(res, 'Pengguna tidak ditemukan', 404);
    }

    const user = users[0];
    const parsedCompetencies = parseCompetenciesArray(user.additional_competencies);

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
      birth_place: user.birth_place,
      birth_date: user.birth_date,
      tmt_date: user.tmt_date,
      formal_education: user.formal_education,
      recognized_education: user.recognized_education,
      team_group: user.team_group,
      employment_status: user.employment_status,
      cert_level: user.cert_level,
      cert_number: user.cert_number,
      cert_expiry_date: user.cert_expiry_date,
      basic_lemdik: user.basic_lemdik,
      basic_cert_number: user.basic_cert_number,
      junior_lemdik: user.junior_lemdik,
      junior_cert_number: user.junior_cert_number,
      senior_lemdik: user.senior_lemdik,
      senior_cert_number: user.senior_cert_number,
      salvage_license_number: user.salvage_license_number,
      salvage_expiry_date: user.salvage_expiry_date,
      refreshing_cert_number: user.refreshing_cert_number,
      refreshing_date: user.refreshing_date,
      salvage_refreshing_cert_number: user.salvage_refreshing_cert_number,
      salvage_refreshing_date: user.salvage_refreshing_date,
      additional_competencies: parsedCompetencies || [],
      signature_url: user.signature_url
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

    // BUTIR TUGAS 5: Naikkan token_version agar sesi lama di perangkat lain otomatis hangus
    await pool.query(
      'UPDATE users SET password_hash = ?, must_change_password = 0, token_version = token_version + 1 WHERE id = ?',
      [newHash, req.user.id]
    );

    return successResponse(res, 'Password berhasil diperbarui');
  } catch (error) {
    console.error('Error changePassword:', error);
    return errorResponse(res, 'Gagal memperbarui password', 500);
  }
};

/**
 * BUTIR TUGAS 5: Logout & Revokasi Sesi Token JWT
 * Menaikkan token_version pada database sehingga token JWT yang beredar seketika tidak valid
 */
export const logout = async (req, res) => {
  try {
    if (req.user?.id) {
      await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [req.user.id]);
    }
    return successResponse(res, 'Berhasil keluar dan sesi telah dicabut');
  } catch (error) {
    console.error('Error logout:', error);
    return errorResponse(res, 'Gagal memproses keluar sesi', 500);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      nip,
      birth_place,
      birth_date,
      tmt_date,
      formal_education,
      recognized_education,
      cert_level,
      cert_number,
      cert_expiry_date,
      basic_lemdik,
      basic_cert_number,
      junior_lemdik,
      junior_cert_number,
      senior_lemdik,
      senior_cert_number,
      salvage_license_number,
      salvage_expiry_date,
      refreshing_cert_number,
      refreshing_date,
      salvage_refreshing_cert_number,
      salvage_refreshing_date,
      additional_competencies
    } = req.body;

    const [personnelRows] = await pool.query('SELECT * FROM personnel WHERE user_id = ?', [req.user.id]);
    if (personnelRows.length === 0) {
      const { name, email } = req.body;
      if (name || email) {
        await pool.query(
          'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
          [name ? String(name).trim() : null, email ? String(email).trim() : null, req.user.id]
        );
      }
      const [userRows] = await pool.query(
        'SELECT id, username, name, email, role, must_change_password FROM users WHERE id = ?',
        [req.user.id]
      );
      return successResponse(res, 'Profil akun berhasil diperbarui', {
        ...userRows[0],
        must_change_password: Boolean(userRows[0].must_change_password),
        additional_competencies: []
      });
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
    const cleanTmtDate = parseDateOrNull(tmt_date, pers.tmt_date);
    const cleanCertExpiry = parseDateOrNull(cert_expiry_date, pers.cert_expiry_date);
    const cleanSalvageExpiry = parseDateOrNull(salvage_expiry_date, pers.salvage_expiry_date);
    const cleanRefreshingDate = parseDateOrNull(refreshing_date, pers.refreshing_date);
    const cleanSalvageRefreshingDate = parseDateOrNull(salvage_refreshing_date, pers.salvage_refreshing_date);

    const cleanStr = (val, fallback) => (val !== undefined ? (val ? String(val).trim() : null) : fallback);

    let cleanCompetencies = pers.additional_competencies;
    if (additional_competencies !== undefined) {
      cleanCompetencies = sanitizeAndValidateCompetencies(additional_competencies, pers.additional_competencies);
    }

    await pool.query(
      `UPDATE personnel SET
        nip = ?,
        birth_place = ?,
        birth_date = ?,
        tmt_date = ?,
        formal_education = ?,
        recognized_education = ?,
        cert_level = ?,
        cert_number = ?,
        cert_expiry_date = ?,
        basic_lemdik = ?,
        basic_cert_number = ?,
        junior_lemdik = ?,
        junior_cert_number = ?,
        senior_lemdik = ?,
        senior_cert_number = ?,
        salvage_license_number = ?,
        salvage_expiry_date = ?,
        refreshing_cert_number = ?,
        refreshing_date = ?,
        salvage_refreshing_cert_number = ?,
        salvage_refreshing_date = ?,
        additional_competencies = ?
      WHERE id = ?`,
      [
        cleanStr(nip, pers.nip),
        cleanStr(birth_place, pers.birth_place),
        cleanBirthDate,
        cleanTmtDate,
        cleanStr(formal_education, pers.formal_education),
        cleanStr(recognized_education, pers.recognized_education),
        sanitizedCertLevel,
        cleanStr(cert_number, pers.cert_number),
        cleanCertExpiry,
        cleanStr(basic_lemdik, pers.basic_lemdik),
        cleanStr(basic_cert_number, pers.basic_cert_number),
        cleanStr(junior_lemdik, pers.junior_lemdik),
        cleanStr(junior_cert_number, pers.junior_cert_number),
        cleanStr(senior_lemdik, pers.senior_lemdik),
        cleanStr(senior_cert_number, pers.senior_cert_number),
        cleanStr(salvage_license_number, pers.salvage_license_number),
        cleanSalvageExpiry,
        cleanStr(refreshing_cert_number, pers.refreshing_cert_number),
        cleanRefreshingDate,
        cleanStr(salvage_refreshing_cert_number, pers.salvage_refreshing_cert_number),
        cleanSalvageRefreshingDate,
        cleanCompetencies,
        pers.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM personnel WHERE id = ?', [pers.id]);
    const resPers = updated[0];
    resPers.additional_competencies = parseCompetenciesArray(resPers.additional_competencies);
    return successResponse(res, 'Profil berhasil diperbarui', resPers);
  } catch (error) {
    console.error('Error updateProfile:', error);
    return errorResponse(res, 'Gagal memperbarui data profil: ' + error.message, 500);
  }
};

