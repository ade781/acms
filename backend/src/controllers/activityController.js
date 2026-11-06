import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');
const formatWIBDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
};

export const VALID_ACTIVITY_TYPES = [
  'serah_terima',
  'apel_briefing',
  'periksa_armada',
  'periksa_peralatan',
  'latihan_drill',
  'pemeliharaan',
  'sosialisasi_keselamatan',
  'catatan_kendala',
];

/**
 * Helper penghapusan berkas fisik secara aman
 */
const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.warn('Gagal membersihkan file (safeUnlink):', err.message);
  }
};


/**
 * Membersihkan berkas yang diunggah multer jika request gagal diproses
 * untuk mencegah kebocoran file sampah (orphan files) di direktori uploads.
 */
const removeUploadedFile = (file) => {
  if (!file) return;
  const targetPath = file.path || (file.filename ? path.resolve(uploadsDir, file.filename) : null);
  if (targetPath && fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath);
    } catch (e) {
      console.warn('Gagal membersihkan orphan file upload:', e.message);
    }
  }
};

export const getActivities = async (req, res) => {
  try {
    const { date, shift, team_group, page, limit, start_date, end_date, period, activity_type } = req.query;

    let query = `
      SELECT a.*, ps.shift_date, ps.shift_number, ps.team_group,
             u.name AS reporter_name
      FROM daily_shift_activities a
      JOIN personnel_shifts ps ON ps.id = a.shift_id
      LEFT JOIN users u ON u.id = a.created_by
      WHERE 1=1
    `;
    const params = [];

    // Filter Rentang Periode atau Shift Tunggal
    if (start_date && end_date) {
      query += ` AND ps.shift_date >= ? AND ps.shift_date <= ?`;
      params.push(start_date, end_date);
    } else if (period) {
      const now = new Date();
      let past = new Date();
      if (period === '1week') past.setDate(now.getDate() - 7);
      else if (period === '3months') past.setMonth(now.getMonth() - 3);
      else if (period === '1year') past.setFullYear(now.getFullYear() - 1);
      else past.setMonth(now.getMonth() - 1); // default 1month

      const startDateStr = formatWIBDate(past);
      const endDateStr = formatWIBDate(now);
      query += ` AND ps.shift_date >= ? AND ps.shift_date <= ?`;
      params.push(startDateStr, endDateStr);
    } else if (date && shift) {
      query += ` AND ps.shift_date = ? AND ps.shift_number = ?`;
      params.push(date, Number(shift));
    } else if (date) {
      query += ` AND ps.shift_date = ?`;
      params.push(date);
    } else {
      const today = formatWIBDate();
      query += ` AND ps.shift_date = ? AND ps.shift_number = 1`;
      params.push(today);
    }

    if (team_group && team_group !== 'ALL' && team_group !== 'all') {
      query += ` AND ps.team_group = ?`;
      params.push(team_group);
    }

    if (activity_type && activity_type !== 'ALL' && activity_type !== 'all') {
      query += ` AND a.activity_type = ?`;
      params.push(activity_type);
    }

    if (start_date || period) {
      query += ` ORDER BY ps.shift_date DESC, a.activity_time ASC, a.id DESC`;
    } else {
      query += ` ORDER BY a.activity_time ASC, a.id ASC`;
    }

    if (limit) {
      const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
      const limitNum = Math.max(1, parseInt(limit, 10));
      const offset = (pageNum - 1) * limitNum;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNum, offset);
    }

    const [rows] = await pool.query(query, params);
    return successResponse(res, 'Daftar aktivitas berhasil diambil', rows);
  } catch (error) {
    console.error('Error getActivities:', error);
    return errorResponse(res, 'Gagal mengambil daftar aktivitas', 500);
  }
};

export const createActivity = async (req, res) => {
  try {
    // BUTIR TUGAS 3: Selaraskan RBAC - seluruh personel dinas terautentikasi (termasuk kru) dapat mencatat kegiatan
    if (!req.user) {
      removeUploadedFile(req.file);
      return errorResponse(res, 'Autentikasi diperlukan untuk mencatat kegiatan', 401);
    }

    const {
      shift_id,
      shift_date,
      shift_number,
      team_group,
      activity_type,
      activity_time,
      title,
      description,
      result_notes,
      actor_ids,
      attachment_url
    } = req.body;

    if (!activity_type || !activity_time || !title) {
      removeUploadedFile(req.file);
      return errorResponse(res, 'Jenis aktivitas, waktu, dan judul aktivitas wajib diisi', 400);
    }

    if (!VALID_ACTIVITY_TYPES.includes(activity_type)) {
      removeUploadedFile(req.file);
      return errorResponse(
        res,
        `Jenis aktivitas '${activity_type}' tidak valid. Kategori yang diperbolehkan: ${VALID_ACTIVITY_TYPES.join(', ')}`,
        400
      );
    }

    const isPrivileged = ['admin', 'dept_head'].includes(req.user?.role);
    let targetShiftId = shift_id;

    if (targetShiftId) {
      // Validasi ketat keberadaan shift_id terhadap tabel personnel_shifts
      const [shiftRows] = await pool.query(
        'SELECT id, shift_date, shift_number, team_group, status FROM personnel_shifts WHERE id = ?',
        [targetShiftId]
      );
      if (shiftRows.length === 0) {
        removeUploadedFile(req.file);
        return errorResponse(res, 'Shift dinas dengan ID tersebut tidak ditemukan', 404);
      }

      const targetShift = shiftRows[0];
      // Validasi kepemilikan regu user (kecuali peran admin / dept_head)
      if (!isPrivileged && req.user?.team_group && targetShift.team_group) {
        if (String(req.user.team_group).toLowerCase() !== String(targetShift.team_group).toLowerCase()) {
          removeUploadedFile(req.file);
          return errorResponse(res, 'Akses ditolak: Anda hanya dapat mencatat kegiatan pada shift regu Anda sendiri', 403);
        }
      }
    } else {
      const sDate = shift_date || formatWIBDate();
      const sNum = shift_number ? Number(shift_number) : 1;
      let sTeam = team_group || req.user.team_group || 'Alpha';

      // Validasi jika user non-admin menentukan team_group berbeda
      if (!isPrivileged && req.user?.team_group && team_group) {
        if (String(req.user.team_group).toLowerCase() !== String(team_group).toLowerCase()) {
          removeUploadedFile(req.file);
          return errorResponse(res, 'Akses ditolak: Anda hanya dapat mencatat kegiatan pada regu Anda sendiri', 403);
        }
      }

      const [existingShift] = await pool.query(
        'SELECT id, team_group FROM personnel_shifts WHERE shift_date = ? AND shift_number = ? AND team_group = ?',
        [sDate, sNum, sTeam]
      );

      if (existingShift.length > 0) {
        targetShiftId = existingShift[0].id;
      } else {
        let assignedSupervisorId = null;
        if (req.user.role === 'supervisor') {
          assignedSupervisorId = req.user.id;
        } else {
          // Cari supervisor aktif untuk regu terkait jika ada
          const [supervisorRows] = await pool.query(
            "SELECT id FROM users WHERE role = 'supervisor' AND team_group = ? AND is_active = 1 LIMIT 1",
            [sTeam]
          );
          if (supervisorRows.length > 0) {
            assignedSupervisorId = supervisorRows[0].id;
          }
        }

        const [newShift] = await pool.query(
          'INSERT INTO personnel_shifts (shift_date, shift_number, team_group, supervisor_id) VALUES (?, ?, ?, ?)',
          [sDate, sNum, sTeam, assignedSupervisorId]
        );
        targetShiftId = newShift.insertId;
      }
    }

    let formattedActorIds = null;
    if (actor_ids) {
      if (typeof actor_ids === 'string') {
        formattedActorIds = actor_ids;
      } else {
        formattedActorIds = JSON.stringify(actor_ids);
      }
    }

    const finalAttachmentUrl = req.file ? `/uploads/${req.file.filename}` : (attachment_url || null);

    // Simpan data kegiatan beserta created_by (ID personel pencatat)
    const [result] = await pool.query(
      `INSERT INTO daily_shift_activities (
        shift_id, activity_type, activity_time, title, description,
        result_notes, actor_ids, attachment_url, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        targetShiftId,
        activity_type,
        activity_time,
        title,
        description || null,
        result_notes || null,
        formattedActorIds,
        finalAttachmentUrl,
        req.user.id
      ]
    );

    const [created] = await pool.query('SELECT * FROM daily_shift_activities WHERE id = ?', [result.insertId]);
    return createdResponse(res, 'Aktivitas berhasil ditambahkan ke logbook shift', created[0]);
  } catch (error) {
    removeUploadedFile(req.file);
    console.error('Error createActivity:', error);
    return errorResponse(res, 'Gagal mencatat aktivitas: ' + error.message, 500);
  }
};

export const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { activity_type, activity_time, title, description, result_notes, actor_ids, attachment_url } = req.body;

    if (activity_type !== undefined && !VALID_ACTIVITY_TYPES.includes(activity_type)) {
      removeUploadedFile(req.file);
      return errorResponse(
        res,
        `Jenis aktivitas '${activity_type}' tidak valid. Kategori yang diperbolehkan: ${VALID_ACTIVITY_TYPES.join(', ')}`,
        400
      );
    }

    // BUTIR TUGAS 2: Ambil data kegiatan beserta info shift regunya (Pencegahan Celah IDOR)
    const [existing] = await pool.query(
      `SELECT a.*, ps.shift_date, ps.shift_number, ps.team_group, ps.supervisor_id
       FROM daily_shift_activities a
       JOIN personnel_shifts ps ON ps.id = a.shift_id
       WHERE a.id = ?`,
      [id]
    );

    if (existing.length === 0) {
      removeUploadedFile(req.file);
      return errorResponse(res, 'Aktivitas tidak ditemukan', 404);
    }

    const currentActivity = existing[0];

    // Validasi Otorisasi (Anti-IDOR):
    // Izinkan HANYA jika:
    // 1. Role adalah Admin atau Dept Head
    // 2. Role adalah Chief / Supervisor pada regu yang sama
    // 3. User adalah pemilik sah/pencatat kegiatan tersebut (created_by === req.user.id)
    const isAdmin = ['admin', 'dept_head'].includes(req.user?.role);
    const isTeamChief =
      ['chief', 'chief_assistant', 'supervisor', 'operation_chief'].includes(req.user?.role) &&
      (!req.user?.team_group ||
       !currentActivity.team_group ||
       String(req.user?.team_group).toLowerCase() === String(currentActivity.team_group).toLowerCase());
    const isOwner = currentActivity.created_by && Number(currentActivity.created_by) === Number(req.user?.id);

    if (!isAdmin && !isTeamChief && !isOwner) {
      removeUploadedFile(req.file);
      return errorResponse(
        res,
        'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah catatan kegiatan ini',
        403
      );
    }

    let finalAttachmentUrl = currentActivity.attachment_url;
    let fileToDeleteAfterUpdate = null;

    if (req.file) {
      finalAttachmentUrl = `/uploads/${req.file.filename}`;
      // Tandai file lama jika ada untuk dibersihkan setelah database berhasil diperbarui
      if (currentActivity.attachment_url) {
        fileToDeleteAfterUpdate = path.resolve(uploadsDir, path.basename(currentActivity.attachment_url));
      }
    } else if (attachment_url !== undefined) {
      finalAttachmentUrl = attachment_url ? attachment_url : null;
      // Jika foto lama dikosongkan/dihapus, tandai file lama untuk dihapus
      if (!finalAttachmentUrl && currentActivity.attachment_url) {
        fileToDeleteAfterUpdate = path.resolve(uploadsDir, path.basename(currentActivity.attachment_url));
      }
    }

    let finalActorIds = currentActivity.actor_ids;
    if (actor_ids !== undefined) {
      if (actor_ids === null) {
        finalActorIds = null;
      } else if (typeof actor_ids === 'string') {
        finalActorIds = actor_ids;
      } else {
        finalActorIds = JSON.stringify(actor_ids);
      }
    }

    const finalDescription = description !== undefined ? description : currentActivity.description;
    const finalResultNotes = result_notes !== undefined ? result_notes : currentActivity.result_notes;

    await pool.query(
      `UPDATE daily_shift_activities SET
        activity_type = COALESCE(?, activity_type),
        activity_time = COALESCE(?, activity_time),
        title = COALESCE(?, title),
        description = ?,
        result_notes = ?,
        actor_ids = ?,
        attachment_url = ?
       WHERE id = ?`,
      [
        activity_type || null,
        activity_time || null,
        title || null,
        finalDescription,
        finalResultNotes,
        finalActorIds,
        finalAttachmentUrl,
        id
      ]
    );

    // Post-commit cleanup: Jalankan safeUnlink HANYA setelah query UPDATE database berhasil
    if (fileToDeleteAfterUpdate) {
      await safeUnlink(fileToDeleteAfterUpdate);
    }

    const [updated] = await pool.query('SELECT * FROM daily_shift_activities WHERE id = ?', [id]);
    return successResponse(res, 'Aktivitas berhasil diperbarui', updated[0]);
  } catch (error) {
    removeUploadedFile(req.file);
    console.error('Error updateActivity:', error);
    return errorResponse(res, 'Gagal memperbarui aktivitas', 500);
  }
};

export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil data kegiatan terlebih dahulu dan verifikasi otorisasi regu (Anti-IDOR)
    const [existing] = await pool.query(
      `SELECT a.id, a.attachment_url, a.created_by, ps.shift_date, ps.shift_number, ps.team_group, ps.supervisor_id, ps.status
       FROM daily_shift_activities a
       JOIN personnel_shifts ps ON ps.id = a.shift_id
       WHERE a.id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return errorResponse(res, 'Aktivitas tidak ditemukan', 404);
    }

    const activity = existing[0];

    // Validasi Otorisasi:
    // 1. Role Admin atau Dept Head
    // 2. Role Chief / Supervisor pada regu yang sama
    // 3. Pemilik catatan (isOwner = activity.created_by === req.user.id) pada shift yang sedang berjalan
    const isAdmin = ['admin', 'dept_head'].includes(req.user?.role);
    const isTeamChief =
      ['chief', 'chief_assistant', 'supervisor', 'operation_chief'].includes(req.user?.role) &&
      (!req.user?.team_group ||
       !activity.team_group ||
       String(req.user?.team_group).toLowerCase() === String(activity.team_group).toLowerCase());
    const isOwner = activity.created_by && Number(activity.created_by) === Number(req.user?.id);

    if (!isAdmin && !isTeamChief && !isOwner) {
      return errorResponse(
        res,
        'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus catatan kegiatan ini',
        403
      );
    }

    // Jika pemilik catatan (dan bukan admin/chief), izinkan HANYA pada shift yang sedang berjalan
    if (isOwner && !isAdmin && !isTeamChief) {
      const todayWIB = formatWIBDate();
      const shiftDateStr = activity.shift_date instanceof Date
        ? formatWIBDate(activity.shift_date)
        : (activity.shift_date ? String(activity.shift_date).slice(0, 10) : '');

      if (shiftDateStr && shiftDateStr !== todayWIB) {
        return errorResponse(
          res,
          'Akses ditolak: Personel hanya dapat menghapus catatan kegiatan miliknya sendiri pada shift yang sedang berjalan',
          403
        );
      }
    }

    await pool.query('DELETE FROM daily_shift_activities WHERE id = ?', [id]);

    // Hapus file fisik dari disk jika ada (post-delete cleanup)
    if (activity.attachment_url) {
      const filename = path.basename(activity.attachment_url);
      const filePath = path.resolve(uploadsDir, filename);
      await safeUnlink(filePath);
    }

    return successResponse(res, 'Aktivitas berhasil dihapus dari logbook');
  } catch (error) {
    console.error('Error deleteActivity:', error);
    return errorResponse(res, 'Gagal menghapus aktivitas', 500);
  }
};

