import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';
import { generatePersonnelAccountsPdf } from '../services/pdfService.js';
import { sanitizeAndValidateCompetencies, parseCompetenciesArray } from '../utils/competencyHelper.js';
import { getOfficialSignatory } from '../utils/officialHelper.js';
import { mapRankPositionToRole, cleanTeam } from '../utils/roleMapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

export const getPersonnelList = async (req, res) => {
  try {
    const { team_group, team, search, cert_level, is_active, compact } = req.query;
    const effectiveTeam = team_group || team;
    const isCompact = compact === 'true' || compact === true;

    const selectColumns = isCompact
      ? `p.id, p.nip, p.full_name, p.team_group, p.rank_position, p.employment_status, p.cert_level, p.cert_expiry_date, p.is_active`
      : `p.*, u.username, u.email as user_email, u.role as user_role, u.must_change_password`;

    let query = `
      SELECT ${selectColumns}
      FROM personnel p
      ${isCompact ? '' : 'LEFT JOIN users u ON u.id = p.user_id'}
      WHERE 1=1
    `;
    const params = [];

    if (effectiveTeam && effectiveTeam !== 'ALL') {
      query += ` AND p.team_group = ?`;
      params.push(effectiveTeam);
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
    const formattedRows = isCompact
      ? rows
      : rows.map((p) => ({
          ...p,
          additional_competencies: parseCompetenciesArray(p.additional_competencies),
        }));

    return res.status(200).json({
      success: true,
      message: 'Daftar personel berhasil diambil',
      data: formattedRows
    });
  } catch (error) {
    console.error('Error getPersonnelList:', error);
    return errorResponse(res, 'Gagal mengambil daftar personel', 500);
  }
};

export const exportPersonnelPdf = async (req, res) => {
  try {
    const { team_group, team } = req.query;
    const effectiveTeam = team_group || team;

    let query = `
      SELECT p.*, u.username, u.email as user_email, u.role as user_role, u.must_change_password
      FROM personnel p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE 1=1
    `;
    const params = [];

    if (effectiveTeam && effectiveTeam !== 'ALL') {
      query += ` AND p.team_group = ?`;
      params.push(effectiveTeam);
    }

    query += ` ORDER BY p.team_group ASC, p.id ASC`;

    const [rows] = await pool.query(query, params);

    // Ambil pejabat Dept Head / Section Head resmi untuk tanda tangan pengesahan
    const signatory = await getOfficialSignatory(pool);

    const doc = await generatePersonnelAccountsPdf(rows, signatory);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Buku_Induk_Personel_ARFF_YIA.pdf"'
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
    personnel.additional_competencies = parseCompetenciesArray(personnel.additional_competencies);

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

export { mapRankPositionToRole } from '../utils/roleMapper.js';

/**
 * Helper untuk mendeteksi apakah jabatan merupakan Ketua Regu (Chief) murni
 * (Bukan Asisten Chief / Wakil)
 */
export function isChiefRank(rank) {
  if (!rank) return false;
  const r = rank.trim().toLowerCase();
  if (r.includes('assistant') || r.includes('asisten') || r.includes('wakil')) {
    return false;
  }
  return r.includes('chief') || r.includes('ketua regu');
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

    // Proteksi Integritas Ketua Regu (Chief): Setiap regu operasional HANYA BISA MEMILIKI MAKSIMAL 1 KETUA REGU
    const effectiveRole = role && role !== 'operator' ? role : mapRankPositionToRole(rank_position);
    const isTargetingChief = isChiefRank(rank_position) || effectiveRole === 'chief' || effectiveRole === 'supervisor';

    if (isTargetingChief && validTeams.includes(team_group)) {
      const [existingChiefs] = await connection.query(
        `SELECT p.id, p.full_name
         FROM personnel p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.team_group = ?
           AND p.is_active = 1
           AND (
             u.role IN ('chief', 'supervisor') 
             OR p.rank_position LIKE '%Chief%' 
             OR p.rank_position LIKE '%Ketua%'
           )
           AND p.rank_position NOT LIKE '%Assistant%'
           AND p.rank_position NOT LIKE '%Asisten%'
           AND (u.role IS NULL OR u.role != 'chief_assistant')`,
        [team_group]
      );

      if (existingChiefs.length > 0) {
        connection.release();
        return errorResponse(
          res,
          `Regu ${team_group} sudah memiliki Ketua Regu (Chief: ${existingChiefs[0].full_name}). Setiap regu operasional hanya boleh memiliki tepat 1 Ketua Regu. Gunakan menu 'Kelola Pejabat' untuk mengganti posisi Ketua Regu.`,
          400
        );
      }
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
      birth_place,
      birth_date,
      tmt_date,
      employment_status,
      team_group,
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
      additional_competencies,
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
    const cleanTmtDate = parseDateOrNull(tmt_date, existing[0].tmt_date);
    const cleanCertExpiry = parseDateOrNull(cert_expiry_date, existing[0].cert_expiry_date);
    const cleanSalvageExpiry = parseDateOrNull(salvage_expiry_date, existing[0].salvage_expiry_date);
    const cleanRefreshingDate = parseDateOrNull(refreshing_date, existing[0].refreshing_date);
    const cleanSalvageRefreshingDate = parseDateOrNull(salvage_refreshing_date, existing[0].salvage_refreshing_date);

    const cleanStr = (val, fallback) => (val !== undefined ? (val ? String(val).trim() : null) : fallback);

    let cleanCompetencies = existing[0].additional_competencies;
    if (additional_competencies !== undefined) {
      cleanCompetencies = sanitizeAndValidateCompetencies(additional_competencies, existing[0].additional_competencies);
    }

    // Proteksi Integritas Mutasi Regu & Status Aktif:
    // Dilarang memindahkan regu atau menonaktifkan personel yang sedang bertugas aktif di armada/posko pada shift berjalan
    const isTeamGroupChanged = isStaffAdmin && effectiveTeamGroup && effectiveTeamGroup !== existing[0].team_group;
    const isDeactivated = isStaffAdmin && effectiveIsActive === 0 && existing[0].is_active === 1;

    if (isTeamGroupChanged || isDeactivated) {
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
        return errorResponse(
          res,
          'Personel sedang aktif bertugas pada shift dinas saat ini. Lepaskan penugasan di menu Ploting terlebih dahulu sebelum melakukan mutasi/penonaktifan.',
          400
        );
      }
    }

    // Proteksi Integritas Ketua Regu (Chief): Setiap regu operasional HANYA BISA MEMILIKI MAKSIMAL 1 KETUA REGU (CHIEF)
    const isTargetingChief = isChiefRank(effectiveRankPosition) || (rank_position && mapRankPositionToRole(rank_position) === 'chief');
    const targetTeam = effectiveTeamGroup;
    const validOperationalTeams = ['Alpha', 'Bravo', 'Charlie', 'Delta'];

    if (isStaffAdmin && isTargetingChief && validOperationalTeams.includes(targetTeam) && effectiveIsActive !== 0) {
      const [existingChiefs] = await pool.query(
        `SELECT p.id, p.full_name
         FROM personnel p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.team_group = ?
           AND p.id != ?
           AND p.is_active = 1
           AND (
             u.role IN ('chief', 'supervisor') 
             OR p.rank_position LIKE '%Chief%' 
             OR p.rank_position LIKE '%Ketua%'
           )
           AND p.rank_position NOT LIKE '%Assistant%'
           AND p.rank_position NOT LIKE '%Asisten%'
           AND (u.role IS NULL OR u.role != 'chief_assistant')`,
        [targetTeam, id]
      );

      if (existingChiefs.length > 0) {
        return errorResponse(
          res,
          `Regu ${targetTeam} sudah memiliki Ketua Regu aktif (${existingChiefs[0].full_name}). Setiap regu operasional hanya boleh memiliki tepat 1 Ketua Regu. Untuk mengganti posisi Ketua Regu, silakan gunakan menu 'Kelola Pejabat'.`,
          400
        );
      }
    }

    await pool.query(
      `UPDATE personnel SET
        nip = ?,
        full_name = ?,
        rank_position = ?,
        birth_place = ?,
        birth_date = ?,
        tmt_date = ?,
        employment_status = ?,
        team_group = ?,
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
        additional_competencies = ?,
        is_active = ?
      WHERE id = ?`,
      [
        effectiveNip !== undefined ? (effectiveNip ? String(effectiveNip).trim() : null) : existing[0].nip,
        effectiveFullName,
        effectiveRankPosition,
        cleanStr(birth_place, existing[0].birth_place),
        cleanBirthDate,
        cleanTmtDate,
        effectiveEmploymentStatus,
        effectiveTeamGroup,
        cleanStr(formal_education, existing[0].formal_education),
        cleanStr(recognized_education, existing[0].recognized_education),
        effectiveCertLevel,
        cleanStr(cert_number, existing[0].cert_number),
        cleanCertExpiry,
        cleanStr(basic_lemdik, existing[0].basic_lemdik),
        cleanStr(basic_cert_number, existing[0].basic_cert_number),
        cleanStr(junior_lemdik, existing[0].junior_lemdik),
        cleanStr(junior_cert_number, existing[0].junior_cert_number),
        cleanStr(senior_lemdik, existing[0].senior_lemdik),
        cleanStr(senior_cert_number, existing[0].senior_cert_number),
        cleanStr(salvage_license_number, existing[0].salvage_license_number),
        cleanSalvageExpiry,
        cleanStr(refreshing_cert_number, existing[0].refreshing_cert_number),
        cleanRefreshingDate,
        cleanStr(salvage_refreshing_cert_number, existing[0].salvage_refreshing_cert_number),
        cleanSalvageRefreshingDate,
        cleanCompetencies,
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
    const resPers = updated[0];
    resPers.additional_competencies = parseCompetenciesArray(resPers.additional_competencies);
    return successResponse(res, 'Data personel berhasil diperbarui', resPers);
  } catch (error) {
    console.error('Error updatePersonnel:', error);
    return errorResponse(res, 'Gagal memperbarui data personel: ' + error.message, 500);
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
        'Personel sedang aktif bertugas pada shift dinas saat ini. Lepaskan penugasan di menu Ploting terlebih dahulu sebelum melakukan mutasi/penonaktifan.',
        400
      );
    }

    await connection.beginTransaction();

    // 1. Hapus berkas tanda tangan fisik jika ada
    if (signature_url) {
      const sigFileName = path.basename(signature_url);
      const sigPath = path.resolve(uploadsDir, sigFileName);
      if (fs.existsSync(sigPath)) {
        try { fs.unlinkSync(sigPath); } catch (e) {}
      }
    }

    // 2. Hapus dokumen fisik di storage dan rekaman di tabel personnel_documents
    const [docs] = await connection.query('SELECT file_url FROM personnel_documents WHERE personnel_id = ?', [id]);
    for (const doc of docs) {
      if (doc.file_url) {
        const docFileName = path.basename(doc.file_url);
        const filePath = path.resolve(uploadsDir, docFileName);
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

// ==========================================
// Re-export Dokumen & Tanda Tangan Digital (personnelDocumentController)
// ==========================================
export {
  getPersonnelDocuments,
  uploadPersonnelDocument,
  deletePersonnelDocument,
  uploadSignature,
  deleteSignature
} from './personnelDocumentController.js';

// ==========================================
// Re-export Pengelolaan Pejabat Struktural (officialsController)
// ==========================================
export {
  getOfficials,
  replaceDeptHead,
  replaceChief
} from './officialsController.js';

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



