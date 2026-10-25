import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';
import { generatePersonnelAccountsPdf } from '../services/pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Ambil daftar dokumen berkas pendukung personel
    const [docs] = await pool.query(
      `SELECT pd.*, u.name as uploader_name
       FROM personnel_documents pd
       LEFT JOIN users u ON u.id = pd.uploaded_by
       WHERE pd.personnel_id = ?
       ORDER BY pd.created_at DESC`,
      [id]
    );
    personnel.documents = (docs || []).map((doc) => ({
      ...doc,
      view_url: `/api/documents/${doc.id}/view`,
      download_url: `/api/documents/${doc.id}/download`,
    }));

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

/**
 * Menghitung waktu operasional shift berjalan (WIB / UTC+7)
 */
export function getCurrentOperationalShiftBackend(dateObj = new Date()) {
  const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  const wibDate = new Date(utc + (7 * 3600000));

  const hours = wibDate.getHours();
  const minutes = wibDate.getMinutes();
  const timeVal = hours * 60 + minutes;

  let shiftNumber = 1;
  const shiftDate = new Date(wibDate);

  if (timeVal >= 420 && timeVal < 780) { // 07:00 - 13:00 WIB
    shiftNumber = 1;
  } else if (timeVal >= 780 && timeVal < 1200) { // 13:00 - 20:00 WIB
    shiftNumber = 2;
  } else { // 20:00 - 07:00 WIB
    shiftNumber = 3;
    if (timeVal < 420) {
      shiftDate.setDate(shiftDate.getDate() - 1);
    }
  }

  const year = shiftDate.getFullYear();
  const month = String(shiftDate.getMonth() + 1).padStart(2, '0');
  const day = String(shiftDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  return { shiftNumber, dateStr };
}

export function mapRankPositionToRole(rank) {
  if (!rank) return 'junior_firefighter';
  const r = rank.trim().toLowerCase();
  if (r.includes('dept. head') || r.includes('dept head') || r.includes('department head')) {
    return 'dept_head';
  }
  if (r.includes('section head') || r.includes('seksi')) {
    return 'section_head';
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
  const connection = await pool.getConnection();
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
      connection.release();
      return errorResponse(res, 'Nama lengkap, jabatan, dan regu dinas wajib diisi', 400);
    }

    const validTeams = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    if (!validTeams.includes(team_group)) {
      connection.release();
      return errorResponse(res, 'Regu dinas harus salah satu dari: Alpha, Bravo, Charlie, Delta', 400);
    }

    // 1. Otomatis buatkan akun pengguna langsung untuk setiap personel baru
    let accountUsername = username;
    if (!accountUsername) {
      accountUsername = await generateUniqueUsername(nip, full_name);
    } else {
      const [existingUser] = await connection.query('SELECT id FROM users WHERE username = ?', [accountUsername]);
      if (existingUser.length > 0) {
        accountUsername = await generateUniqueUsername(nip, full_name);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || '123456', salt);
    const effectiveRole = role && role !== 'operator' ? role : mapRankPositionToRole(rank_position);

    await connection.beginTransaction();

    const [userResult] = await connection.query(
      'INSERT INTO users (username, name, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 1)',
      [accountUsername, full_name, passwordHash, effectiveRole]
    );
    const linkedUserId = userResult.insertId;

    // 2. Simpan data personel tertaut dengan akun pengguna
    const [result] = await connection.query(
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
    const [createdRows] = await connection.query('SELECT * FROM personnel WHERE id = ?', [newPersonnelId]);

    await connection.commit();
    connection.release();

    return createdResponse(
      res,
      `Personel berhasil ditambahkan. Akun login dibuat dengan username "${accountUsername}" dan wajib ganti kata sandi pada login pertama.`,
      {
        ...createdRows[0],
        created_username: accountUsername
      }
    );
  } catch (error) {
    await connection.rollback();
    connection.release();
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

    // Hanya staf kepemimpinan (Admin, Supervisor, Chief, Dept Head) yang berhak mengubah data kedinasan:
    // jabatan (rank_position), regu (team_group), status keaktifan (is_active), status kepegawaian, dan nama resmi
    const effectiveRankPosition = isStaffAdmin && rank_position ? rank_position : existing[0].rank_position;
    const effectiveTeamGroup = isStaffAdmin && team_group ? team_group : existing[0].team_group;
    const effectiveIsActive = isStaffAdmin && is_active !== undefined ? Number(is_active) : existing[0].is_active;
    const effectiveEmploymentStatus = isStaffAdmin && employment_status ? employment_status : existing[0].employment_status;
    const effectiveFullName = isStaffAdmin && full_name ? full_name : existing[0].full_name;
    const effectiveNip = isStaffAdmin && nip !== undefined ? nip : existing[0].nip;
    let effectiveCertLevel = isStaffAdmin && cert_level ? cert_level : existing[0].cert_level;
    if (effectiveCertLevel) {
      const cl = String(effectiveCertLevel);
      if (cl.includes('Senior')) effectiveCertLevel = 'Senior';
      else if (cl.includes('Junior')) effectiveCertLevel = 'Junior';
      else if (cl.includes('Basic')) effectiveCertLevel = 'Basic';
      else effectiveCertLevel = 'Basic';
    }

    const parseDateOrNull = (val, fallback) => {
      if (val === undefined) return fallback;
      if (!val || String(val).trim() === '' || String(val).trim() === '-' || String(val).startsWith('0000')) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : String(val).split('T')[0];
    };

    const cleanBirthDate = parseDateOrNull(birth_date, existing[0].birth_date);
    const cleanExpiryDate = parseDateOrNull(cert_expiry_date, existing[0].cert_expiry_date);

    // Proteksi Integritas Mutasi Regu & Status Aktif:
    // Dilarang memindahkan regu atau menonaktifkan personel yang sedang bertugas aktif di armada/posko pada shift berjalan
    if (isStaffAdmin && effectiveTeamGroup && effectiveTeamGroup !== existing[0].team_group) {
      const { shiftNumber: curShiftNum, dateStr: curDateStr } = getCurrentOperationalShiftBackend();
      const [activeDuties] = await pool.query(
        `SELECT pd.id, pd.is_pic, pd.deployment_type, ps.shift_date, ps.shift_number, ps.team_group,
                v.vehicle_name, v.code_name
         FROM personnel_deployments pd
         JOIN personnel_shifts ps ON ps.id = pd.shift_id
         LEFT JOIN vehicles v ON v.id = pd.vehicle_id
         WHERE pd.personnel_id = ?
           AND pd.deployment_type IN ('vehicle_utama', 'vehicle_pendukung', 'watchroom')
           AND ps.shift_date = ?
           AND ps.shift_number = ?`,
        [id, curDateStr, curShiftNum]
      );

      if (activeDuties.length > 0) {
        const duty = activeDuties[0];
        const unitName = duty.code_name || duty.vehicle_name || (duty.deployment_type === 'watchroom' ? 'Posko Watch Room' : 'Armada Operasional');
        const roleName = duty.is_pic ? 'PIC' : 'Kru';
        return errorResponse(
          res,
          `Gagal memindahkan regu: Personel "${existing[0].full_name}" saat ini masih bertugas aktif sebagai ${roleName} di ${unitName} pada shift berjalan (${duty.team_group}, Shift ${duty.shift_number}). Silakan minta Chief melepaskan atau mengganti penugasan personel ini di menu Ploting Dinas terlebih dahulu sebelum memindahkan regu.`,
          400
        );
      }
    }

    if (isStaffAdmin && effectiveIsActive === 0 && existing[0].is_active === 1) {
      const { shiftNumber: curShiftNum, dateStr: curDateStr } = getCurrentOperationalShiftBackend();
      const [activeDuties] = await pool.query(
        `SELECT pd.id, pd.is_pic, pd.deployment_type, ps.shift_date, ps.shift_number, ps.team_group,
                v.vehicle_name, v.code_name
         FROM personnel_deployments pd
         JOIN personnel_shifts ps ON ps.id = pd.shift_id
         LEFT JOIN vehicles v ON v.id = pd.vehicle_id
         WHERE pd.personnel_id = ?
           AND pd.deployment_type IN ('vehicle_utama', 'vehicle_pendukung', 'watchroom')
           AND ps.shift_date = ?
           AND ps.shift_number = ?`,
        [id, curDateStr, curShiftNum]
      );

      if (activeDuties.length > 0) {
        const duty = activeDuties[0];
        const unitName = duty.code_name || duty.vehicle_name || (duty.deployment_type === 'watchroom' ? 'Posko Watch Room' : 'Armada Operasional');
        const roleName = duty.is_pic ? 'PIC' : 'Kru';
        return errorResponse(
          res,
          `Gagal menonaktifkan personel: Personel "${existing[0].full_name}" saat ini masih bertugas aktif sebagai ${roleName} di ${unitName} pada shift berjalan (${duty.team_group}, Shift ${duty.shift_number}). Silakan minta Chief melepaskan penugasan di menu Ploting Dinas terlebih dahulu.`,
          400
        );
      }
    }

    await pool.query(
      `UPDATE personnel SET
        nip = ?,
        full_name = ?,
        rank_position = ?,
        birth_date = ?,
        employment_status = ?,
        team_group = ?,
        formal_education = ?,
        cert_level = ?,
        cert_number = ?,
        cert_expiry_date = ?,
        is_active = ?
      WHERE id = ?`,
      [
        effectiveNip !== undefined ? (effectiveNip ? String(effectiveNip).trim() : null) : existing[0].nip,
        effectiveFullName,
        effectiveRankPosition,
        cleanBirthDate,
        effectiveEmploymentStatus,
        effectiveTeamGroup,
        formal_education !== undefined ? (formal_education ? String(formal_education).trim() : null) : existing[0].formal_education,
        effectiveCertLevel,
        cert_number !== undefined ? (cert_number ? String(cert_number).trim() : null) : existing[0].cert_number,
        cleanExpiryDate,
        effectiveIsActive,
        id
      ]
    );

    // Sinkronisasikan role di tabel users jika akun pengguna terhubung (hanya jika diubah oleh staf berwenang)
    if (existing[0].user_id) {
      const synchedRole = (isStaffAdmin && rank_position) ? mapRankPositionToRole(rank_position) : null;
      if (synchedRole) {
        await pool.query('UPDATE users SET role = ?, name = COALESCE(?, name) WHERE id = ?', [
          synchedRole,
          effectiveFullName,
          existing[0].user_id
        ]);
      } else if (isStaffAdmin && full_name) {
        await pool.query('UPDATE users SET name = ? WHERE id = ?', [effectiveFullName, existing[0].user_id]);
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
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const [existing] = await connection.query('SELECT id, user_id, full_name, signature_url FROM personnel WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const { user_id, full_name, signature_url } = existing[0];

    // Proteksi: Cegah penghapusan personel yang masih bertugas aktif pada shift berjalan
    const { shiftNumber: curShiftNum, dateStr: curDateStr } = getCurrentOperationalShiftBackend();
    const [activeDuties] = await connection.query(
      `SELECT pd.id, pd.is_pic, pd.deployment_type, ps.shift_date, ps.shift_number, ps.team_group,
              v.vehicle_name, v.code_name
       FROM personnel_deployments pd
       JOIN personnel_shifts ps ON ps.id = pd.shift_id
       LEFT JOIN vehicles v ON v.id = pd.vehicle_id
       WHERE pd.personnel_id = ?
         AND pd.deployment_type IN ('vehicle_utama', 'vehicle_pendukung', 'watchroom')
         AND ps.shift_date = ?
         AND ps.shift_number = ?`,
      [id, curDateStr, curShiftNum]
    );

    if (activeDuties.length > 0) {
      connection.release();
      const duty = activeDuties[0];
      const unitName = duty.code_name || duty.vehicle_name || (duty.deployment_type === 'watchroom' ? 'Posko Watch Room' : 'Armada Operasional');
      const roleName = duty.is_pic ? 'PIC' : 'Kru';
      return errorResponse(
        res,
        `Gagal menghapus personel: Personel "${full_name}" saat ini masih bertugas aktif sebagai ${roleName} di ${unitName} pada shift berjalan (${duty.team_group}, Shift ${duty.shift_number}). Silakan minta Chief melepaskan penugasan di menu Ploting Dinas terlebih dahulu.`,
        400
      );
    }

    await connection.beginTransaction();

    // 1. Hapus berkas tanda tangan fisik jika ada
    if (signature_url) {
      const sigPath = path.resolve(process.cwd(), signature_url.replace(/^\//, ''));
      if (fs.existsSync(sigPath)) {
        try { fs.unlinkSync(sigPath); } catch (e) {}
      }
    }

    // 2. Hapus dokumen fisik di storage dan rekaman di tabel personnel_documents
    const [docs] = await connection.query('SELECT file_url FROM personnel_documents WHERE personnel_id = ?', [id]);
    for (const doc of docs) {
      if (doc.file_url) {
        const filePath = path.resolve(process.cwd(), doc.file_url.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    }
    await connection.query('DELETE FROM personnel_documents WHERE personnel_id = ?', [id]);

    // 3. Hapus seluruh data ploting shift
    await connection.query('DELETE FROM personnel_deployments WHERE personnel_id = ?', [id]);

    // 4. Lepaskan dari PIC armada jika ada
    await connection.query('UPDATE vehicle_readiness_logs SET pic_personnel_id = NULL WHERE pic_personnel_id = ?', [id]);

    // 5. Hapus entri personel
    await connection.query('DELETE FROM personnel WHERE id = ?', [id]);

    // 6. Hapus akun user terkait jika bukan akun administrator utama
    if (user_id) {
      const [u] = await connection.query('SELECT role FROM users WHERE id = ?', [user_id]);
      if (u.length > 0 && u[0].role !== 'admin') {
        await connection.query('DELETE FROM users WHERE id = ?', [user_id]);
      }
    }

    await connection.commit();
    connection.release();

    return successResponse(res, `Anggota personel ${full_name} berhasil dihapus dari sistem.`);
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error deletePersonnel:', error);
    return errorResponse(res, 'Gagal menghapus data personel: ' + error.message, 500);
  }
};

export const uploadSignature = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return errorResponse(res, 'Berkas tanda tangan belum dipilih atau format tidak sesuai', 400);
    }

    const [rows] = await pool.query(
      `SELECT p.*, u.role as user_role
       FROM personnel p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const target = rows[0];
    const targetRole = target.user_role || mapRankPositionToRole(target.rank_position);

    // HANYA dept_head, section_head, chief, dan chief_assistant yang berhak memiliki & mengunggah tanda tangan
    const allowedSignatureRoles = ['dept_head', 'section_head', 'chief', 'chief_assistant'];
    const isTargetEligible = allowedSignatureRoles.includes(targetRole);

    if (!isTargetEligible) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(
        res,
        'Akses ditolak: Opsi tanda tangan hanya diperuntukkan bagi Department Head, Section Head, Chief, dan Chief Assistant.',
        403
      );
    }

    // Pengecekan user yang mengunggah (hanya dept_head, section_head, chief, chief_assistant, atau admin)
    const currentUserRole = req.user.role;
    const isUploaderEligible = ['admin', 'dept_head', 'section_head', 'chief', 'chief_assistant'].includes(currentUserRole);

    if (!isUploaderEligible) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Anda tidak memiliki hak untuk mengunggah tanda tangan.', 403);
    }

    // Jika bukan admin, pastikan yang mengunggah adalah pemilik akun itu sendiri atau sesama pimpinan
    if (
      currentUserRole !== 'admin' &&
      target.user_id &&
      target.user_id !== req.user.id &&
      !['dept_head', 'section_head', 'chief'].includes(currentUserRole)
    ) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Anda hanya dapat mengunggah tanda tangan untuk akun Anda sendiri.', 403);
    }

    // Hapus berkas tanda tangan lama jika ada
    if (target.signature_url) {
      const oldPath = path.resolve(__dirname, '../../', target.signature_url.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn('Gagal menghapus tanda tangan lama:', e.message);
        }
      }
    }

    const signatureUrl = `/uploads/${req.file.filename}`;

    // Update signature_url di tabel personnel
    await pool.query('UPDATE personnel SET signature_url = ? WHERE id = ?', [signatureUrl, id]);

    // Update signature_url di tabel users jika terhubung
    if (target.user_id) {
      await pool.query('UPDATE users SET signature_url = ? WHERE id = ?', [signatureUrl, target.user_id]);
    }

    return successResponse(res, 'Tanda tangan digital resmi berhasil diunggah', {
      signature_url: signatureUrl
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error uploadSignature:', error);
    return errorResponse(res, 'Gagal mengunggah tanda tangan: ' + error.message, 500);
  }
};

export const deleteSignature = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT p.*, u.role as user_role
       FROM personnel p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const target = rows[0];
    const currentUserRole = req.user.role;

    if (!['admin', 'dept_head', 'section_head', 'chief', 'chief_assistant'].includes(currentUserRole)) {
      return errorResponse(res, 'Anda tidak memiliki hak untuk menghapus tanda tangan.', 403);
    }

    if (target.signature_url) {
      const oldPath = path.resolve(__dirname, '../../', target.signature_url.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {}
      }
    }

    await pool.query('UPDATE personnel SET signature_url = NULL WHERE id = ?', [id]);
    if (target.user_id) {
      await pool.query('UPDATE users SET signature_url = NULL WHERE id = ?', [target.user_id]);
    }

    return successResponse(res, 'Tanda tangan digital berhasil dihapus');
  } catch (error) {
    console.error('Error deleteSignature:', error);
    return errorResponse(res, 'Gagal menghapus tanda tangan', 500);
  }
};

export const getPersonnelDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT p.id, p.user_id FROM personnel p WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const target = rows[0];
    const currentUserRole = req.user.role;
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor', 'operation_chief'].includes(currentUserRole);
    const isOwner = (req.user.personnel_id && Number(req.user.personnel_id) === Number(id)) ||
                    (target.user_id && Number(req.user.id) === Number(target.user_id));

    if (!isLeadership && !isOwner) {
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat berkas dokumen personel ini', 403);
    }

    const [docs] = await pool.query(
      `SELECT pd.*, u.name as uploader_name
       FROM personnel_documents pd
       LEFT JOIN users u ON u.id = pd.uploaded_by
       WHERE pd.personnel_id = ?
       ORDER BY pd.created_at DESC`,
      [id]
    );

    const formattedDocs = (docs || []).map((doc) => ({
      ...doc,
      view_url: `/api/documents/${doc.id}/view`,
      download_url: `/api/documents/${doc.id}/download`,
    }));

    return successResponse(res, 'Daftar dokumen personel berhasil diambil', formattedDocs);
  } catch (error) {
    console.error('Error getPersonnelDocuments:', error);
    return errorResponse(res, 'Gagal mengambil dokumen personel', 500);
  }
};

export const uploadPersonnelDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, document_type = 'dokumen_lain' } = req.body;

    if (!req.file) {
      return errorResponse(res, 'Berkas dokumen wajib diunggah (PDF, PNG, JPG, WebP)', 400);
    }

    const [rows] = await pool.query(
      `SELECT p.*, u.id as user_acc_id FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const target = rows[0];
    const currentUserRole = req.user.role;
    const isLeadership = ['admin', 'dept_head', 'chief', 'chief_assistant'].includes(currentUserRole);
    const isSelf = (req.user.personnel_id && Number(req.user.personnel_id) === Number(id)) ||
                   (target.user_id && Number(req.user.id) === Number(target.user_id));

    if (!isLeadership && !isSelf) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk mengunggah dokumen personel ini', 403);
    }

    const docTitle = title && title.trim().length > 0 ? title.trim() : req.file.originalname;
    const fileUrl = `/uploads/${req.file.filename}`;
    const fileSize = req.file.size || 0;
    const mimeType = req.file.mimetype || 'application/octet-stream';

    const [result] = await pool.query(
      `INSERT INTO personnel_documents (
        personnel_id, title, document_type, file_name, file_url, file_size, mime_type, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, docTitle, document_type, req.file.originalname, fileUrl, fileSize, mimeType, req.user.id]
    );

    const [newDocRows] = await pool.query(
      `SELECT pd.*, u.name as uploader_name
       FROM personnel_documents pd
       LEFT JOIN users u ON u.id = pd.uploaded_by
       WHERE pd.id = ?`,
      [result.insertId]
    );

    const createdDoc = {
      ...newDocRows[0],
      view_url: `/api/documents/${newDocRows[0].id}/view`,
      download_url: `/api/documents/${newDocRows[0].id}/download`,
    };

    return successResponse(res, 'Dokumen personel berhasil diunggah', createdDoc, 201);
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    console.error('Error uploadPersonnelDocument:', error);
    return errorResponse(res, 'Gagal mengunggah dokumen: ' + error.message, 500);
  }
};

export const deletePersonnelDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;

    const [docRows] = await pool.query(
      `SELECT pd.*, p.user_id
       FROM personnel_documents pd
       JOIN personnel p ON p.id = pd.personnel_id
       WHERE pd.id = ? AND pd.personnel_id = ?`,
      [docId, id]
    );

    if (docRows.length === 0) {
      return errorResponse(res, 'Dokumen tidak ditemukan', 404);
    }

    const doc = docRows[0];
    const currentUserRole = req.user.role;
    const isLeadership = ['admin', 'dept_head'].includes(currentUserRole);
    const isUploader = doc.uploaded_by && Number(doc.uploaded_by) === Number(req.user.id);
    const isSelf = (req.user.personnel_id && Number(req.user.personnel_id) === Number(id)) ||
                   (doc.user_id && Number(req.user.id) === Number(doc.user_id));

    if (!isLeadership && !isUploader && !isSelf) {
      return errorResponse(res, 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus dokumen ini', 403);
    }

    // Hapus file fisik dari storage jika ada
    if (doc.file_url) {
      const filePath = path.resolve(__dirname, '../../', doc.file_url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {}
      }
    }

    await pool.query('DELETE FROM personnel_documents WHERE id = ?', [docId]);

    return successResponse(res, 'Dokumen personel berhasil dihapus');
  } catch (error) {
    console.error('Error deletePersonnelDocument:', error);
    return errorResponse(res, 'Gagal menghapus dokumen', 500);
  }
};

export const getOfficials = async (req, res) => {
  try {
    // 1. Dept Head (Airport Technology & ARFF Dept. Head)
    const [deptHeads] = await pool.query(
      `SELECT p.*, u.username, u.email as user_email, u.role as user_role,
              COALESCE(u.signature_url, p.signature_url) as signature_url
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE (p.rank_position LIKE '%Dept%Head%' OR p.rank_position LIKE '%Department Head%' OR u.role = 'dept_head')
         AND p.rank_position NOT LIKE '%Section%'
       ORDER BY p.id ASC
       LIMIT 1`
    );
    const deptHead = deptHeads.length > 0 ? deptHeads[0] : null;

    // 2. Section Head (Airport Technology & ARFF Section Head)
    const [sectionHeads] = await pool.query(
      `SELECT p.*, u.username, u.email as user_email, u.role as user_role,
              COALESCE(u.signature_url, p.signature_url) as signature_url
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.rank_position LIKE '%Section%Head%' OR p.rank_position LIKE '%Seksi%' OR u.role = 'section_head'
       ORDER BY p.id ASC
       LIMIT 1`
    );
    const sectionHead = sectionHeads.length > 0 ? sectionHeads[0] : null;

    // 3. 4 Chiefs for Alpha, Bravo, Charlie, Delta (Case-Insensitive Normalization)
    const [chiefs] = await pool.query(
      `SELECT p.*, u.username, u.email as user_email, u.role as user_role,
              COALESCE(u.signature_url, p.signature_url) as signature_url
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE (u.role IN ('chief', 'supervisor') OR p.rank_position LIKE '%Chief%' OR p.rank_position LIKE '%Ketua%')
         AND p.rank_position NOT LIKE '%Assistant%'
         AND p.rank_position NOT LIKE '%Asisten%'
         AND p.rank_position NOT LIKE '%Wakil%'
         AND u.role != 'chief_assistant'
       ORDER BY p.team_group ASC, p.id ASC`
    );

    const chiefsByTeam = {
      Alpha: chiefs.find((c) => (c.team_group || '').toLowerCase().trim() === 'alpha') || null,
      Bravo: chiefs.find((c) => (c.team_group || '').toLowerCase().trim() === 'bravo') || null,
      Charlie: chiefs.find((c) => (c.team_group || '').toLowerCase().trim() === 'charlie') || null,
      Delta: chiefs.find((c) => (c.team_group || '').toLowerCase().trim() === 'delta') || null,
    };

    return successResponse(res, 'Data pejabat berhasil diambil', {
      dept_head: deptHead,
      section_head: sectionHead,
      chiefs: chiefsByTeam,
      raw_chiefs: chiefs,
    });
  } catch (error) {
    console.error('Error getOfficials:', error);
    return errorResponse(res, 'Gagal mengambil data pejabat', 500);
  }
};

export const replaceDeptHead = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { full_name, nip, rank_position, new_personnel_id } = req.body;

    await connection.beginTransaction();

    // 1. Ambil data Dept Head lama
    const [currentDeptHeads] = await connection.query(
      `SELECT p.*, u.id as u_id
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.rank_position LIKE '%Dept%Head%' OR p.rank_position LIKE '%Department Head%' OR u.role = 'dept_head'`
    );

    // KASUS A: Input Data Mandiri (Sesuai Aturan GEMINI.md Rule 18 & task_agent1.md)
    if (full_name && full_name.trim()) {
      const cleanName = full_name.trim();
      const cleanNip = nip && nip.trim() && nip.trim() !== '-' ? nip.trim() : null;
      const cleanRank = rank_position && rank_position.trim() ? rank_position.trim() : 'Airport Technology & ARFF Dept. Head';

      let deptHeadId;
      if (currentDeptHeads.length > 0) {
        const existingDh = currentDeptHeads[0];
        deptHeadId = existingDh.id;
        await connection.query(
          `UPDATE personnel 
           SET full_name = ?, nip = ?, rank_position = ?, team_group = 'Non-Shift' 
           WHERE id = ?`,
          [cleanName, cleanNip, cleanRank, deptHeadId]
        );
        if (existingDh.u_id) {
          await connection.query(
            `UPDATE users SET name = ?, role = 'dept_head' WHERE id = ? AND role != 'admin'`,
            [cleanName, existingDh.u_id]
          );
        }
      } else {
        const accountUsername = await generateUniqueUsername(cleanNip, cleanName);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('123456', salt);

        const [uRes] = await connection.query(
          'INSERT INTO users (username, name, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 1)',
          [accountUsername, cleanName, passwordHash, 'dept_head']
        );
        const [pRes] = await connection.query(
          `INSERT INTO personnel (
            user_id, nip, full_name, rank_position,
            employment_status, team_group, cert_level, is_active
          ) VALUES (?, ?, ?, ?, 'organik', 'Non-Shift', 'Senior', 1)`,
          [uRes.insertId, cleanNip, cleanName, cleanRank]
        );
        deptHeadId = pRes.insertId;
      }

      await connection.commit();
      return successResponse(res, `Data Dept. Head berhasil disimpan atas nama ${cleanName}.`, { id: deptHeadId });
    }

    // KASUS B: Penunjukan via ID Personel (Fallback kompatibilitas)
    if (new_personnel_id) {
      for (const oldDh of currentDeptHeads) {
        if (oldDh.id === Number(new_personnel_id)) continue;

        if (oldDh.signature_url) {
          const sigPath = path.resolve(__dirname, '../../', oldDh.signature_url.replace(/^\//, ''));
          if (fs.existsSync(sigPath)) {
            try { fs.unlinkSync(sigPath); } catch (e) {}
          }
        }

        await connection.query(
          `UPDATE personnel 
           SET rank_position = 'Staf Non-Operasional', team_group = 'Non-Shift', signature_url = NULL 
           WHERE id = ?`,
          [oldDh.id]
        );
        if (oldDh.u_id) {
          await connection.query(
            `UPDATE users 
             SET role = 'junior_firefighter', signature_url = NULL 
             WHERE id = ? AND role = 'dept_head'`,
            [oldDh.u_id]
          );
        }
      }

      const [newCandidate] = await connection.query(
        `SELECT p.*, u.id as u_id FROM personnel p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
        [new_personnel_id]
      );

      if (newCandidate.length === 0) {
        await connection.rollback();
        return errorResponse(res, 'Personel baru tidak ditemukan', 404);
      }

      const candidate = newCandidate[0];
      await connection.query(
        `UPDATE personnel 
         SET rank_position = 'Airport Technology & ARFF Dept. Head', team_group = 'Non-Shift' 
         WHERE id = ?`,
        [candidate.id]
      );

      if (candidate.u_id) {
        await connection.query(
          `UPDATE users SET role = 'dept_head' WHERE id = ? AND role != 'admin'`,
          [candidate.u_id]
        );
      }

      await connection.commit();
      return successResponse(res, `Dept. Head berhasil diperbarui menjadi ${candidate.full_name}.`, { id: candidate.id });
    }

    await connection.rollback();
    return errorResponse(res, 'Nama lengkap Dept. Head wajib diisi', 400);
  } catch (error) {
    await connection.rollback();
    console.error('Error replaceDeptHead:', error);
    return errorResponse(res, 'Gagal memperbarui Dept Head: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

export const replaceChief = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { team_group, new_chief_id, old_chief_target_role } = req.body;
    if (!team_group || !new_chief_id) {
      return errorResponse(res, 'Regu dan Ketua Regu baru wajib dipilih', 400);
    }

    const validTargetRoles = [
      'ARFF Operation Senior Fire Fighter',
      'ARFF Operation Chief Assistant',
      'ARFF Operation Junior Fire Fighter',
    ];
    const demoteRole = validTargetRoles.includes(old_chief_target_role)
      ? old_chief_target_role
      : 'ARFF Operation Senior Fire Fighter';

    const demoteUserRole =
      demoteRole === 'ARFF Operation Chief Assistant'
        ? 'chief_assistant'
        : demoteRole === 'ARFF Operation Senior Fire Fighter'
        ? 'senior_firefighter'
        : 'junior_firefighter';

    await connection.beginTransaction();

    // 1. Ambil Chief lama untuk regu ini
    const [currentChiefs] = await connection.query(
      `SELECT p.*, u.id as u_id
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.team_group = ? 
         AND (u.role IN ('chief', 'supervisor') OR p.rank_position LIKE '%Chief%' OR p.rank_position LIKE '%Ketua%')
         AND p.rank_position NOT LIKE '%Assistant%'
         AND p.rank_position NOT LIKE '%Asisten%'
         AND u.role != 'chief_assistant'`,
      [team_group]
    );

    for (const oldChief of currentChiefs) {
      if (oldChief.id === Number(new_chief_id)) continue;

      // Hapus file tanda tangan lama jika ada
      if (oldChief.signature_url) {
        const sigPath = path.resolve(__dirname, '../../', oldChief.signature_url.replace(/^\//, ''));
        if (fs.existsSync(sigPath)) {
          try {
            fs.unlinkSync(sigPath);
          } catch (e) {}
        }
      }

      // Demote Chief lama ke target posisi sesuai Opsi C, tanda tangan otomatis terhapus
      await connection.query(
        `UPDATE personnel 
         SET rank_position = ?, signature_url = NULL 
         WHERE id = ?`,
        [demoteRole, oldChief.id]
      );
      if (oldChief.u_id) {
        await connection.query(
          `UPDATE users 
           SET role = ?, signature_url = NULL 
           WHERE id = ? AND role != 'admin'`,
          [demoteUserRole, oldChief.u_id]
        );
      }
    }

    // 2. Angkat Chief baru untuk regu ini
    const [newCandidate] = await connection.query(
      `SELECT p.*, u.id as u_id FROM personnel p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [new_chief_id]
    );

    if (newCandidate.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'Personel baru tidak ditemukan', 404);
    }

    const candidate = newCandidate[0];
    await connection.query(
      `UPDATE personnel 
       SET rank_position = 'ARFF Operation Chief', team_group = ? 
       WHERE id = ?`,
      [team_group, candidate.id]
    );

    if (candidate.u_id) {
      await connection.query(
        `UPDATE users SET role = 'chief' WHERE id = ? AND role != 'admin'`,
        [candidate.u_id]
      );
    }

    await connection.commit();
    return successResponse(res, `Ketua Regu ${team_group} berhasil diganti menjadi ${candidate.full_name}.`);
  } catch (error) {
    await connection.rollback();
    console.error('Error replaceChief:', error);
    return errorResponse(res, 'Gagal mengganti Ketua Regu: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

export const replaceSectionHead = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { new_personnel_id } = req.body;
    if (!new_personnel_id) {
      return errorResponse(res, 'Personel Section Head baru wajib dipilih', 400);
    }

    await connection.beginTransaction();

    // 1. Ambil data Section Head lama
    const [currentSectionHeads] = await connection.query(
      `SELECT p.*, u.id as u_id
       FROM personnel p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.rank_position LIKE '%Section%Head%' OR p.rank_position LIKE '%Seksi%' OR u.role = 'section_head'`
    );

    for (const oldSh of currentSectionHeads) {
      if (oldSh.id === Number(new_personnel_id)) continue;

      // Hapus file tanda tangan lama jika ada
      if (oldSh.signature_url) {
        const sigPath = path.resolve(__dirname, '../../', oldSh.signature_url.replace(/^\//, ''));
        if (fs.existsSync(sigPath)) {
          try {
            fs.unlinkSync(sigPath);
          } catch (e) {}
        }
      }

      await connection.query(
        `UPDATE personnel 
         SET rank_position = 'Staf Non-Operasional', team_group = 'Non-Shift', signature_url = NULL 
         WHERE id = ?`,
        [oldSh.id]
      );

      if (oldSh.u_id) {
        await connection.query(
          `UPDATE users 
           SET role = 'junior_firefighter', signature_url = NULL 
           WHERE id = ? AND role = 'section_head'`,
          [oldSh.u_id]
        );
      }
    }

    // 2. Angkat Section Head baru
    const [newCandidate] = await connection.query(
      `SELECT p.*, u.id as u_id FROM personnel p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [new_personnel_id]
    );

    if (newCandidate.length === 0) {
      await connection.rollback();
      return errorResponse(res, 'Personel baru tidak ditemukan', 404);
    }

    const candidate = newCandidate[0];
    await connection.query(
      `UPDATE personnel 
       SET rank_position = 'Airport Technology & ARFF Section Head', team_group = 'Non-Shift' 
       WHERE id = ?`,
      [candidate.id]
    );

    if (candidate.u_id) {
      await connection.query(
        `UPDATE users SET role = 'section_head' WHERE id = ? AND role != 'admin'`,
        [candidate.u_id]
      );
    }

    await connection.commit();
    return successResponse(res, `Section Head berhasil diperbarui menjadi ${candidate.full_name}.`);
  } catch (error) {
    await connection.rollback();
    console.error('Error replaceSectionHead:', error);
    return errorResponse(res, 'Gagal memperbarui Section Head: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

export const resetPersonnelPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const [personnel] = await pool.query('SELECT id, user_id, full_name FROM personnel WHERE id = ?', [id]);
    if (personnel.length === 0) {
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const { user_id, full_name } = personnel[0];
    if (!user_id) {
      return errorResponse(res, 'Personel ini belum memiliki akun pengguna yang terhubung', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const defaultHash = await bcrypt.hash('123456', salt);

    await pool.query(
      'UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?',
      [defaultHash, user_id]
    );

    return successResponse(res, `Kata sandi untuk ${full_name} berhasil direset ke bawaan (123456).`);
  } catch (error) {
    console.error('Error resetPersonnelPassword:', error);
    return errorResponse(res, 'Gagal mereset kata sandi: ' + error.message, 500);
  }
};



