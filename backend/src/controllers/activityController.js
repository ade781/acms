import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';

export const getActivities = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;

    let query = `
      SELECT a.*, ps.shift_date, ps.shift_number, ps.team_group
      FROM daily_shift_activities a
      JOIN personnel_shifts ps ON ps.id = a.shift_id
      WHERE ps.shift_date = ? AND ps.shift_number = ?
    `;
    const params = [shiftDate, shiftNumber];

    if (team_group) {
      query += ` AND ps.team_group = ?`;
      params.push(team_group);
    }

    query += ` ORDER BY a.activity_time ASC, a.id ASC`;

    const [rows] = await pool.query(query, params);
    return successResponse(res, 'Daftar aktivitas berhasil diambil', rows);
  } catch (error) {
    console.error('Error getActivities:', error);
    return errorResponse(res, 'Gagal mengambil daftar aktivitas', 500);
  }
};

export const createActivity = async (req, res) => {
  try {
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
        const [newShift] = await pool.query(
          'INSERT INTO personnel_shifts (shift_date, shift_number, team_group, supervisor_id) VALUES (?, ?, ?, ?)',
          [sDate, sNum, sTeam, req.user.id]
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

    const [result] = await pool.query(
      `INSERT INTO daily_shift_activities (
        shift_id, activity_type, activity_time, title, description,
        result_notes, actor_ids, attachment_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        targetShiftId,
        activity_type,
        activity_time,
        title,
        description || null,
        result_notes || null,
        formattedActorIds,
        finalAttachmentUrl
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
    const { activity_type, activity_time, title, description, result_notes, actor_ids } = req.body;

    const [existing] = await pool.query('SELECT id FROM daily_shift_activities WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Aktivitas tidak ditemukan', 404);
    }

    await pool.query(
      `UPDATE daily_shift_activities SET
        activity_type = COALESCE(?, activity_type),
        activity_time = COALESCE(?, activity_time),
        title = COALESCE(?, title),
        description = ?,
        result_notes = ?,
        actor_ids = COALESCE(?, actor_ids)
       WHERE id = ?`,
      [
        activity_type || null,
        activity_time || null,
        title || null,
        description !== undefined ? description : null,
        result_notes !== undefined ? result_notes : null,
        actor_ids ? JSON.stringify(actor_ids) : null,
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
    const [existing] = await pool.query('SELECT id FROM daily_shift_activities WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, 'Aktivitas tidak ditemukan', 404);
    }

    await pool.query('DELETE FROM daily_shift_activities WHERE id = ?', [id]);
    return successResponse(res, 'Aktivitas berhasil dihapus dari logbook');
  } catch (error) {
    console.error('Error deleteActivity:', error);
    return errorResponse(res, 'Gagal menghapus aktivitas', 500);
  }
};
