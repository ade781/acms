import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

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

      const startDateStr = past.toISOString().split('T')[0];
      const endDateStr = now.toISOString().split('T')[0];
      query += ` AND ps.shift_date >= ? AND ps.shift_date <= ?`;
      params.push(startDateStr, endDateStr);
    } else if (date && shift) {
      query += ` AND ps.shift_date = ? AND ps.shift_number = ?`;
      params.push(date, Number(shift));
    } else if (date) {
      query += ` AND ps.shift_date = ?`;
      params.push(date);
    } else {
      const today = new Date().toISOString().split('T')[0];
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
      return errorResponse(res, 'Jenis aktivitas, waktu, dan judul aktivitas wajib diisi', 400);
    }

    let targetShiftId = shift_id;

    if (!targetShiftId) {
      const sDate = shift_date || new Date().toISOString().split('T')[0];
      const sNum = shift_number ? Number(shift_number) : 1;
      const sTeam = team_group || req.user.team_group || 'Alpha';

      const [existingShift] = await pool.query(
        'SELECT id FROM personnel_shifts WHERE shift_date = ? AND shift_number = ? AND team_group = ?',
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
    console.error('Error createActivity:', error);
    return errorResponse(res, 'Gagal mencatat aktivitas: ' + error.message, 500);
  }
};

export const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { activity_type, activity_time, title, description, result_notes, actor_ids, attachment_url } = req.body;

    // BUTIR TUGAS 2: Ambil data kegiatan beserta info shift regunya (Pencegahan Celah IDOR)
    const [existing] = await pool.query(
      `SELECT a.*, ps.team_group, ps.supervisor_id
       FROM daily_shift_activities a
       JOIN personnel_shifts ps ON ps.id = a.shift_id
       WHERE a.id = ?`,
      [id]
    );

    if (existing.length === 0) {
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
      return errorResponse(
        res,
        'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah catatan kegiatan ini',
        403
      );
    }

    let finalAttachmentUrl = currentActivity.attachment_url;

    if (req.file) {
      finalAttachmentUrl = `/uploads/${req.file.filename}`;
      // Hapus file lama jika ada
      if (currentActivity.attachment_url) {
        const oldFile = path.resolve(uploadsDir, path.basename(currentActivity.attachment_url));
        if (fs.existsSync(oldFile)) {
          try {
            await fs.promises.unlink(oldFile);
          } catch (e) {
            console.warn('Gagal menghapus file lama aktivitas:', e.message);
          }
        }
      }
    } else if (attachment_url !== undefined) {
      finalAttachmentUrl = attachment_url ? attachment_url : null;
      // Jika foto lama dikosongkan/dihapus, hapus file lama dari disk
      if (!finalAttachmentUrl && currentActivity.attachment_url) {
        const oldFile = path.resolve(uploadsDir, path.basename(currentActivity.attachment_url));
        if (fs.existsSync(oldFile)) {
          try {
            await fs.promises.unlink(oldFile);
          } catch (e) {
            console.warn('Gagal menghapus file lama aktivitas saat dikosongkan:', e.message);
          }
        }
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

    const [updated] = await pool.query('SELECT * FROM daily_shift_activities WHERE id = ?', [id]);
    return successResponse(res, 'Aktivitas berhasil diperbarui', updated[0]);
  } catch (error) {
    console.error('Error updateActivity:', error);
    return errorResponse(res, 'Gagal memperbarui aktivitas', 500);
  }
};

export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    // BUTIR TUGAS 2 & 3: Ambil data kegiatan terlebih dahulu dan verifikasi otorisasi regu (Anti-IDOR)
    const [existing] = await pool.query(
      `SELECT a.id, a.attachment_url, a.created_by, ps.team_group, ps.supervisor_id
       FROM daily_shift_activities a
       JOIN personnel_shifts ps ON ps.id = a.shift_id
       WHERE a.id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return errorResponse(res, 'Aktivitas tidak ditemukan', 404);
    }

    const activity = existing[0];

    // Validasi Otorisasi: Hanya Admin, Dept Head, atau Chief/Pimpinan pada regu yang sama yang berhak menghapus
    const isAdmin = ['admin', 'dept_head'].includes(req.user?.role);
    const isTeamChief =
      ['chief', 'chief_assistant', 'supervisor', 'operation_chief'].includes(req.user?.role) &&
      (!req.user?.team_group ||
       !activity.team_group ||
       String(req.user?.team_group).toLowerCase() === String(activity.team_group).toLowerCase());

    if (!isAdmin && !isTeamChief) {
      return errorResponse(
        res,
        'Akses ditolak: Hanya Admin atau Chief regu terkait yang berhak menghapus catatan kegiatan',
        403
      );
    }

    await pool.query('DELETE FROM daily_shift_activities WHERE id = ?', [id]);

    // Hapus file fisik dari disk jika ada
    if (activity.attachment_url) {
      const filename = path.basename(activity.attachment_url);
      const filePath = path.resolve(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
        } catch (unlinkErr) {
          console.warn('Gagal menghapus file foto aktivitas:', unlinkErr.message);
        }
      }
    }

    return successResponse(res, 'Aktivitas berhasil dihapus dari logbook');
  } catch (error) {
    console.error('Error deleteActivity:', error);
    return errorResponse(res, 'Gagal menghapus aktivitas', 500);
  }
};

