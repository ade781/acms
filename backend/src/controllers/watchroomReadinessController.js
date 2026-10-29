import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

export const getWatchroomReadiness = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;
    const targetTeam = team_group || req.user.team_group || 'Alpha';

    const [rows] = await pool.query(
      `SELECT vrl.*, v.code_name, v.vehicle_name, p.full_name as inspector_name
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE (v.category = 'posko' OR v.code_name = 'WATCHROOM')
         AND vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
       LIMIT 1`,
      [shiftDate, shiftNumber, targetTeam]
    );

    if (rows.length === 0) {
      // Carry-over kendala: jika belum dilaporkan, cek apakah shift sebelumnya unserviceable
      const [prevLogs] = await pool.query(
        `SELECT vrl.*, v.code_name, v.vehicle_name, p.full_name as inspector_name
         FROM vehicle_readiness_logs vrl
         JOIN vehicles v ON v.id = vrl.vehicle_id
         LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
         WHERE (v.category = 'posko' OR v.code_name = 'WATCHROOM')
           AND (vrl.shift_date < ? OR (vrl.shift_date = ? AND vrl.shift_number < ?))
           AND vrl.status = 'unserviceable'
           AND vrl.follow_up_status != 'resolved'
         ORDER BY vrl.shift_date DESC, vrl.shift_number DESC
         LIMIT 1`,
        [shiftDate, shiftDate, shiftNumber]
      );

      if (prevLogs.length > 0) {
        const prev = prevLogs[0];
        return successResponse(res, 'Data kesiapan watchroom (carry-over kendala)', {
          ...prev,
          shift_date: shiftDate,
          shift_number: shiftNumber,
          team_group: targetTeam,
          status: 'unserviceable',
          is_carried_over: true,
          carried_from: {
            shift_date: prev.shift_date,
            shift_number: prev.shift_number,
            team_group: prev.team_group,
            reported_by: prev.inspector_name
          }
        });
      }

      return successResponse(res, 'Kesiapan watchroom belum dilaporkan pada shift ini', {
        shift_date: shiftDate,
        shift_number: shiftNumber,
        team_group: targetTeam,
        status: 'belum_dilaporkan',
        notes: '',
        inspector_name: null
      });
    }

    return successResponse(res, 'Data kesiapan watchroom berhasil diambil', rows[0]);
  } catch (error) {
    console.error('Error getWatchroomReadiness:', error);
    return errorResponse(res, 'Gagal mengambil data kesiapan watchroom', 500);
  }
};

export const submitWatchroomReadiness = async (req, res) => {
  try {
    const { shift_date, shift_number, team_group, status, notes } = req.body;

    if (!shift_date || !shift_number || !status) {
      return errorResponse(res, 'shift_date, shift_number, dan status wajib diisi', 400);
    }

    if (!['serviceable', 'unserviceable'].includes(status)) {
      return errorResponse(res, 'Status watchroom harus serviceable atau unserviceable', 400);
    }

    if (status === 'unserviceable' && (!notes || notes.trim().length === 0)) {
      return errorResponse(res, 'Justifikasi kendala wajib diisi jika kondisi watchroom unserviceable', 400);
    }

    const targetTeam = team_group || req.user.team_group || 'Alpha';

    if (!['admin', 'dept_head'].includes(req.user.role)) {
      const userTeam = req.user.team_group ? String(req.user.team_group).trim().toLowerCase() : '';
      const currentTargetTeam = targetTeam ? String(targetTeam).trim().toLowerCase() : '';
      if (!userTeam || userTeam !== currentTargetTeam) {
        return errorResponse(
          res,
          `Akses ditolak: Anda terdaftar di Regu ${req.user.team_group} dan tidak berwenang memperbarui kesiapan posko watchroom Regu ${targetTeam}.`,
          403
        );
      }
    }

    const inspectorPersonnelId = req.user.personnel_id || null;

    // Cari ID unit watchroom di tabel vehicles
    let [wrVehicles] = await pool.query(
      `SELECT id FROM vehicles WHERE code_name = 'WATCHROOM' OR category = 'posko' LIMIT 1`
    );

    let wrId;
    if (wrVehicles.length > 0) {
      wrId = wrVehicles[0].id;
    } else {
      const [newWr] = await pool.query(
        `INSERT INTO vehicles (code_name, vehicle_name, category, description, is_active)
         VALUES ('WATCHROOM', 'Watch Room / Pusat Komunikasi ARFF', 'posko', 'Posko monitoring & fasilitas komunikasi darurat ARFF', 1)`
      );
      wrId = newWr.insertId;
    }

    const followUpStatus = status === 'unserviceable' ? 'pending' : 'resolved';
    const resolvedAt = status === 'serviceable' ? new Date() : null;

    const [existing] = await pool.query(
      `SELECT id FROM vehicle_readiness_logs
       WHERE vehicle_id = ? AND shift_date = ? AND shift_number = ? AND team_group = ?`,
      [wrId, shift_date, shift_number, targetTeam]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE vehicle_readiness_logs SET
          status = ?,
          pic_personnel_id = COALESCE(?, pic_personnel_id),
          notes = ?,
          follow_up_status = ?,
          resolved_at = ?
         WHERE id = ?`,
        [status, inspectorPersonnelId, notes || null, followUpStatus, resolvedAt, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO vehicle_readiness_logs (
          vehicle_id, shift_date, shift_number, team_group, status, pic_personnel_id, notes, follow_up_status, resolved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [wrId, shift_date, shift_number, targetTeam, status, inspectorPersonnelId, notes || null, followUpStatus, resolvedAt]
      );
    }

    // Jika watchroom dinyatakan serviceable, tandai backlog unserviceable sebelumnya sebagai resolved
    if (status === 'serviceable') {
      await pool.query(
        `UPDATE vehicle_readiness_logs SET
           follow_up_status = 'resolved',
           resolved_at = CURRENT_TIMESTAMP
         WHERE vehicle_id = ? AND status = 'unserviceable' AND follow_up_status != 'resolved'`,
        [wrId]
      );
    }

    const [updated] = await pool.query(
      `SELECT vrl.*, v.code_name, v.vehicle_name, p.full_name as inspector_name
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE vrl.vehicle_id = ? AND vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?`,
      [wrId, shift_date, shift_number, targetTeam]
    );

    return successResponse(res, 'Kesiapan watchroom berhasil dilaporkan', updated[0]);
  } catch (error) {
    console.error('Error submitWatchroomReadiness:', error);
    return errorResponse(res, 'Gagal menyimpan kesiapan watchroom', 500);
  }
};
