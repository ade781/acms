import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';
import { generatePersonnelAccountsPdf } from '../services/pdfService.js';

export const getPersonnelList = async (req, res) => {
  try {
    const { team_group, search, cert_level, is_active } = req.query;

    let query = `
      SELECT p.*, u.username, u.email as user_email, u.role as user_role, u.must_change_password
      FROM personnel p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE 1=1
    `;
    const params = [];

    if (team_group) {
      query += ` AND p.team_group = ?`;
      params.push(team_group);
    }

    if (cert_level) {
      query += ` AND p.cert_level = ?`;
      params.push(cert_level);
    }

    if (is_active !== undefined) {
      query += ` AND p.is_active = ?`;
      params.push(Number(is_active));
    }

    if (search) {
      query += ` AND (p.full_name LIKE ? OR p.rank_position LIKE ? OR p.nip LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ` ORDER BY p.team_group ASC, p.id ASC`;

    const [rows] = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: 'Daftar personel berhasil diambil',
      data: rows,
      personnel: rows
    });
  } catch (error) {
    console.error('Error getPersonnelList:', error);
    return errorResponse(res, 'Gagal mengambil daftar personel', 500);
  }
};

export const exportPersonnelPdf = async (req, res) => {
  try {
    const { team_group } = req.query;

    let query = `
      SELECT p.*, u.username, u.email as user_email, u.role as user_role, u.must_change_password
      FROM personnel p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE 1=1
    `;
    const params = [];

    if (team_group && team_group !== 'ALL') {
      query += ` AND p.team_group = ?`;
      params.push(team_group);
    }

    query += ` ORDER BY p.team_group ASC, p.id ASC`;

    const [rows] = await pool.query(query, params);

    const doc = generatePersonnelAccountsPdf(rows);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Daftar_Akun_Personel_ARFF_YIA.pdf"'
    );

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error exportPersonnelPdf:', error);
    return errorResponse(res, 'Gagal mencetak PDF akun personel', 500);
  }
};

export const getPersonnelById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT p.*, u.username, u.email as user_email, u.role as user_role, u.must_change_password
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const personnel = rows[0];
    personnel.documents_status = 'coming_soon';
    personnel.documents_message = 'Fitur Pengunggahan Berkas (Coming Soon)';

    return res.status(200).json({
      success: true,
      message: 'Data personel berhasil diambil',
      data: personnel,
      personnel: personnel
    });
  } catch (error) {
    console.error('Error getPersonnelById:', error);
    return errorResponse(res, 'Gagal mengambil detail personel', 500);
  }
};

export function mapRankPositionToRole(rank) {
  if (!rank) return 'junior_firefighter';
  const r = rank.trim().toLowerCase();
  if (r.includes('dept. head') || r.includes('dept head') || r.includes('department head') || r.includes('section head')) {
    return 'dept_head';
  }
  if (r.includes('chief assistant') || r.includes('asisten chief') || r.includes('wakil')) {
    return 'chief_assistant';
  }
  if (r.includes('chief') || r.includes('ketua regu')) {
    return 'chief';
  }
  if (r.includes('senior')) {
    return 'senior_firefighter';
  }
  if (r.includes('admin')) {
    return 'admin';
  }
  return 'junior_firefighter';
}

async function generateUniqueUsername(nip, fullName) {
  let baseUsername = '';
  if (nip && nip.trim() && nip.trim() !== '-') {
    baseUsername = nip.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  if (!baseUsername) {
    const cleanName = fullName.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const parts = cleanName.split(/\s+/).filter(Boolean);
    baseUsername = parts[0] || 'personel';
  }

  let finalUsername = baseUsername;
  let counter = 1;
  while (true) {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [finalUsername]);
    if (existing.length === 0) {
      return finalUsername;
    }
    counter++;
    finalUsername = `${baseUsername}${counter}`;
  }
}

export const createPersonnel = async (req, res) => {
  try {
    const {
      nip,
      full_name,
      rank_position,
      birth_date,
      employment_status = 'organik',
      team_group,
      formal_education,
      cert_level = 'Basic',
      cert_number,
      cert_expiry_date,
      username,
      password,
      role
    } = req.body;

    if (!full_name || !rank_position || !team_group) {
      return errorResponse(res, 'Nama lengkap, jabatan, dan regu dinas wajib diisi', 400);
    }

    const validTeams = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    if (!validTeams.includes(team_group)) {
      return errorResponse(res, 'Regu dinas harus salah satu dari: Alpha, Bravo, Charlie, Delta', 400);
    }

    // 1. Otomatis buatkan akun pengguna langsung untuk setiap personel baru
    let accountUsername = username;
    if (!accountUsername) {
      accountUsername = await generateUniqueUsername(nip, full_name);
    } else {
      const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ?', [accountUsername]);
      if (existingUser.length > 0) {
        accountUsername = await generateUniqueUsername(nip, full_name);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || '123456', salt);
    const effectiveRole = role && role !== 'operator' ? role : mapRankPositionToRole(rank_position);

    const [userResult] = await pool.query(
      'INSERT INTO users (username, name, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 1)',
      [accountUsername, full_name, passwordHash, effectiveRole]
    );
    const linkedUserId = userResult.insertId;

    // 2. Simpan data personel tertaut dengan akun pengguna
    const [result] = await pool.query(
      `INSERT INTO personnel (
        user_id, nip, full_name, rank_position, birth_date,
        employment_status, team_group, formal_education, cert_level,
        cert_number, cert_expiry_date, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        linkedUserId,
        nip || null,
        full_name,
        rank_position,
        birth_date || null,
        employment_status,
        team_group,
        formal_education || null,
        cert_level,
        cert_number || null,
        cert_expiry_date || null
      ]
    );

    const newPersonnelId = result.insertId;
    const [createdRows] = await pool.query('SELECT * FROM personnel WHERE id = ?', [newPersonnelId]);

    return createdResponse(
      res,
      `Personel berhasil ditambahkan. Akun login otomatis dibuat: Username "${accountUsername}", Kata Sandi Default "123456".`,
      {
        ...createdRows[0],
        created_username: accountUsername,
        default_password: '123456'
      }
    );
  } catch (error) {
    console.error('Error createPersonnel:', error);
    return errorResponse(res, 'Gagal menambahkan personel: ' + error.message, 500);
  }
};

export const updatePersonnel = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nip,
      full_name,
      rank_position,
      birth_date,
      employment_status,
      team_group,
      formal_education,
      cert_level,
      cert_number,
      cert_expiry_date,
      is_active
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM personnel WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    // Otorisasi: Admin, Supervisor, Chief, & Dept Head dapat mengedit semua, user biasa hanya dapat mengedit data miliknya sendiri
    const isStaffAdmin = ['admin', 'supervisor', 'chief', 'operation_chief', 'dept_head'].includes(req.user.role);
    const isOwner =
      (req.user.personnel_id && req.user.personnel_id === Number(id)) ||
      (existing[0].user_id && existing[0].user_id === req.user.id) ||
      (req.user.name && existing[0].full_name && req.user.name.trim().toLowerCase() === existing[0].full_name.trim().toLowerCase());

    if (!isStaffAdmin && !isOwner) {
      return errorResponse(res, 'Anda hanya memiliki izin untuk memperbarui data profil Anda sendiri', 403);
    }

    // Hanya staf berwenang (Chief, Dept Head, Admin) yang dapat mengubah Jabatan Operasional (Role)
    const effectiveRankPosition = isStaffAdmin && rank_position ? rank_position : existing[0].rank_position;

    await pool.query(
      `UPDATE personnel SET
        nip = COALESCE(?, nip),
        full_name = COALESCE(?, full_name),
        rank_position = ?,
        birth_date = ?,
        employment_status = COALESCE(?, employment_status),
        team_group = COALESCE(?, team_group),
        formal_education = ?,
        cert_level = COALESCE(?, cert_level),
        cert_number = ?,
        cert_expiry_date = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ?`,
      [
        nip || null,
        full_name || null,
        effectiveRankPosition,
        birth_date !== undefined ? birth_date : existing[0].birth_date,
        employment_status || null,
        team_group || null,
        formal_education !== undefined ? formal_education : existing[0].formal_education,
        cert_level || null,
        cert_number !== undefined ? cert_number : existing[0].cert_number,
        cert_expiry_date !== undefined ? cert_expiry_date : existing[0].cert_expiry_date,
        is_active !== undefined ? is_active : existing[0].is_active,
        id
      ]
    );

    // Sinkronisasikan role di tabel users jika akun pengguna terhubung
    if (existing[0].user_id) {
      const synchedRole = (isStaffAdmin && rank_position) ? mapRankPositionToRole(rank_position) : null;
      if (synchedRole) {
        await pool.query('UPDATE users SET role = ?, name = COALESCE(?, name) WHERE id = ?', [
          synchedRole,
          full_name || null,
          existing[0].user_id
        ]);
      } else if (full_name) {
        await pool.query('UPDATE users SET name = ? WHERE id = ?', [full_name, existing[0].user_id]);
      }
    }

    const [updated] = await pool.query('SELECT * FROM personnel WHERE id = ?', [id]);
    return successResponse(res, 'Data personel berhasil diperbarui', updated[0]);
  } catch (error) {
    console.error('Error updatePersonnel:', error);
    return errorResponse(res, 'Gagal memperbarui data personel', 500);
  }
};

export const deletePersonnel = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id FROM personnel WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    // Periksa apakah personel sudah memiliki riwayat penempatan dinas
    const [deployments] = await pool.query('SELECT id FROM personnel_deployments WHERE personnel_id = ? LIMIT 1', [id]);
    if (deployments.length > 0) {
      // Soft delete jika sudah memiliki riwayat dinas
      await pool.query('UPDATE personnel SET is_active = 0 WHERE id = ?', [id]);
      return successResponse(res, 'Personel telah dinonaktifkan karena memiliki riwayat dinas');
    }

    await pool.query('DELETE FROM personnel WHERE id = ?', [id]);
    return successResponse(res, 'Data personel berhasil dihapus');
  } catch (error) {
    console.error('Error deletePersonnel:', error);
    return errorResponse(res, 'Gagal menghapus data personel', 500);
  }
};
