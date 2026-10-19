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
    personnel.documents = docs;

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
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const [existing] = await connection.query('SELECT id, user_id, full_name, signature_url FROM personnel WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return errorResponse(res, 'Personel tidak ditemukan', 404);
    }

    const { user_id, full_name, signature_url } = existing[0];

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

    // HANYA dept_head, chief, dan chief_assistant yang berhak memiliki & mengunggah tanda tangan
    const allowedSignatureRoles = ['dept_head', 'chief', 'chief_assistant'];
    const isTargetEligible = allowedSignatureRoles.includes(targetRole);

    if (!isTargetEligible) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(
        res,
        'Akses ditolak: Opsi tanda tangan hanya diperuntukkan bagi Department Head, Chief, dan Chief Assistant.',
        403
      );
    }

    // Pengecekan user yang mengunggah (hanya dept_head, chief, chief_assistant, atau admin)
    const currentUserRole = req.user.role;
    const isUploaderEligible = ['admin', 'dept_head', 'chief', 'chief_assistant'].includes(currentUserRole);

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
      !['dept_head', 'chief'].includes(currentUserRole)
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

    if (!['admin', 'dept_head', 'chief', 'chief_assistant'].includes(currentUserRole)) {
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
    const [docs] = await pool.query(
      `SELECT pd.*, u.name as uploader_name
       FROM personnel_documents pd
       LEFT JOIN users u ON u.id = pd.uploaded_by
       WHERE pd.personnel_id = ?
       ORDER BY pd.created_at DESC`,
      [id]
    );

    return successResponse(res, 'Daftar dokumen personel berhasil diambil', docs);
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

    return successResponse(res, 'Dokumen personel berhasil diunggah', newDocRows[0], 201);
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


