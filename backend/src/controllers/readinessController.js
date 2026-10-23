import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

export const getVehicleReadiness = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;

    const currentTeam = team_group || 'Alpha';

    // Ambil semua armada aktif beserta status kesiapannya pada tanggal, shift, dan regu yang dipilih
    const [rows] = await pool.query(
      `SELECT v.id, v.id as vehicle_id, v.code_name, v.vehicle_name, v.category, v.license_plate, v.description,
              vrl.id as log_id,
              COALESCE(vrl.status, 'belum_dilaporkan') as status,
              vrl.justification, vrl.photo_webp_url, vrl.follow_up_status, vrl.notes, vrl.updated_at as logged_at,
              COALESCE(vrl.team_group, ?) as team_group,
              COALESCE(deploy_pic.id, p_log.id) as pic_personnel_id,
              COALESCE(deploy_pic.full_name, p_log.full_name) as pic_name,
              COALESCE(deploy_pic.nip, p_log.nip) as pic_nip,
              COALESCE(deploy_pic.user_id, p_log.user_id) as pic_user_id
       FROM vehicles v
       LEFT JOIN vehicle_readiness_logs vrl
         ON vrl.vehicle_id = v.id
        AND vrl.shift_date = ?
        AND vrl.shift_number = ?
        AND vrl.team_group = ?
       LEFT JOIN (
         SELECT pd.vehicle_id, p.id, p.full_name, p.nip, p.user_id
         FROM personnel_deployments pd
         JOIN personnel_shifts ps ON ps.id = pd.shift_id
         JOIN personnel p ON p.id = pd.personnel_id
         WHERE ps.shift_date = ?
           AND ps.shift_number = ?
           AND ps.team_group = ?
           AND pd.is_pic = 1
       ) deploy_pic ON deploy_pic.vehicle_id = v.id
       LEFT JOIN personnel p_log
         ON p_log.id = vrl.pic_personnel_id
       WHERE v.is_active = 1
       ORDER BY v.category ASC, v.code_name ASC`,
      [currentTeam, shiftDate, shiftNumber, currentTeam, shiftDate, shiftNumber, currentTeam]
    );

    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    const currentUserPersonnelId = req.user.personnel_id;

    // Carry-over status: Jika unit belum dilaporkan di shift ini, cek apakah unit sebelumnya unserviceable
    // Gunakan 1 query efisien untuk semua unit yang belum dilaporkan (eliminasi N+1 query loop)
    const unreportedVehicleIds = rows.filter(r => r.status === 'belum_dilaporkan').map(r => r.id);

    if (unreportedVehicleIds.length > 0) {
      const [prevLogs] = await pool.query(
        `SELECT vrl.vehicle_id, vrl.status, vrl.justification, vrl.photo_webp_url, vrl.follow_up_status, vrl.notes,
                vrl.shift_date, vrl.shift_number, vrl.team_group, p.full_name as prev_pic_name
         FROM vehicle_readiness_logs vrl
         JOIN (
           SELECT vehicle_id, MAX(CONCAT(shift_date, '_', LPAD(shift_number, 2, '0'))) as max_shift
           FROM vehicle_readiness_logs
           WHERE vehicle_id IN (?)
             AND (shift_date < ? OR (shift_date = ? AND shift_number < ?))
             AND status = 'unserviceable'
             AND follow_up_status != 'resolved'
           GROUP BY vehicle_id
         ) latest ON latest.vehicle_id = vrl.vehicle_id
                 AND CONCAT(vrl.shift_date, '_', LPAD(vrl.shift_number, 2, '0')) = latest.max_shift
         LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
         WHERE vrl.status = 'unserviceable'
           AND vrl.follow_up_status != 'resolved'`,
        [unreportedVehicleIds, shiftDate, shiftDate, shiftNumber]
      );

      const carryOverMap = new Map();
      for (const prev of prevLogs) {
        if (!carryOverMap.has(prev.vehicle_id)) {
          carryOverMap.set(prev.vehicle_id, prev);
        }
      }

      for (let i = 0; i < rows.length; i++) {
        if (rows[i].status === 'belum_dilaporkan' && carryOverMap.has(rows[i].id)) {
          const prev = carryOverMap.get(rows[i].id);
          rows[i].status = 'unserviceable';
          rows[i].justification = prev.justification;
          rows[i].photo_webp_url = prev.photo_webp_url;
          rows[i].follow_up_status = prev.follow_up_status;
          rows[i].notes = prev.notes;
          rows[i].is_carried_over = true;
          rows[i].carried_from = {
            shift_date: prev.shift_date,
            shift_number: prev.shift_number,
            team_group: prev.team_group,
            reported_by: prev.prev_pic_name
          };
        }
      }
    }

    // Berikan flag can_edit untuk setiap unit kendaraan
    const vehiclesWithPermissions = rows.map(item => {
      const isSuper = ['admin', 'supervisor', 'chief', 'chief_assistant', 'operation_chief', 'dept_head'].includes(currentUserRole);
      const isPic = (currentUserPersonnelId && item.pic_personnel_id === currentUserPersonnelId) ||
                    (item.pic_user_id && item.pic_user_id === currentUserId);

      return {
        ...item,
        can_edit: isSuper || Boolean(isPic),
        is_current_user_pic: Boolean(isPic)
      };
    });

    return successResponse(res, 'Data kesiapan armada berhasil diambil', {
      shift_date: shiftDate,
      shift_number: shiftNumber,
      vehicles: vehiclesWithPermissions
    });
  } catch (error) {
    console.error('Error getVehicleReadiness:', error);
    return errorResponse(res, 'Gagal mengambil data kesiapan kendaraan', 500);
  }
};

export const submitVehicleReadiness = async (req, res) => {
  try {
    const {
      vehicle_id,
      shift_date,
      shift_number,
      team_group,
      status,
      justification,
      follow_up_status = 'pending',
      notes
    } = req.body;

    if (!vehicle_id || !shift_date || !shift_number || !status) {
      return errorResponse(res, 'vehicle_id, shift_date, shift_number, dan status wajib diisi', 400);
    }

    if (!['serviceable', 'unserviceable'].includes(status)) {
      return errorResponse(res, 'Status armada harus serviceable atau unserviceable', 400);
    }

    const validFollowUp = ['pending', 'in_progress', 'resolved'];
    const effectiveFollowUp = follow_up_status || 'pending';
    if (!validFollowUp.includes(effectiveFollowUp)) {
      return errorResponse(res, 'follow_up_status harus salah satu dari: pending, in_progress, resolved', 400);
    }

    if (status === 'unserviceable' && effectiveFollowUp === 'resolved') {
      return errorResponse(res, 'Armada dengan status unserviceable tidak dapat ditandai sebagai resolved. Ubah status menjadi serviceable jika kendala telah teratasi.', 400);
    }

    if (status === 'unserviceable' && (!justification || justification.trim().length === 0)) {
      return errorResponse(res, 'Justifikasi kendala wajib diisi jika kondisi armada unserviceable', 400);
    }

    const targetTeam = team_group || req.user.team_group || 'Alpha';

    // 1. Cek izin akses: Apakah user adalah Admin, Supervisor, Chief, Chief Assistant, Dept Head, atau PIC kendaraan di shift tersebut?
    const isSuper = ['admin', 'supervisor', 'chief', 'chief_assistant', 'operation_chief', 'dept_head'].includes(req.user.role);

    let isAuthorizedPic = false;
    let picPersonnelId = null;

    // Periksa dari ploting shift aktif
    const [deployRows] = await pool.query(
      `SELECT pd.personnel_id, pd.is_pic, p.user_id
       FROM personnel_deployments pd
       JOIN personnel_shifts ps ON ps.id = pd.shift_id
       JOIN personnel p ON p.id = pd.personnel_id
       WHERE pd.vehicle_id = ? AND ps.shift_date = ? AND ps.shift_number = ? AND ps.team_group = ? AND pd.is_pic = 1`,
      [vehicle_id, shift_date, shift_number, targetTeam]
    );

    if (deployRows.length > 0) {
      picPersonnelId = deployRows[0].personnel_id;
      if (
        (req.user.personnel_id && req.user.personnel_id === deployRows[0].personnel_id) ||
        (deployRows[0].user_id && deployRows[0].user_id === req.user.id)
      ) {
        isAuthorizedPic = true;
      }
    } else {
      // Periksa dari log kesiapan sebelumnya jika ploting belum terdaftar
      const [existingLog] = await pool.query(
        `SELECT pic_personnel_id FROM vehicle_readiness_logs
         WHERE vehicle_id = ? AND shift_date = ? AND shift_number = ? AND team_group = ?`,
        [vehicle_id, shift_date, shift_number, targetTeam]
      );
      if (existingLog.length > 0 && existingLog[0].pic_personnel_id) {
        picPersonnelId = existingLog[0].pic_personnel_id;
        if (req.user.personnel_id === picPersonnelId) {
          isAuthorizedPic = true;
        }
      }
    }

    if (!isSuper && !isAuthorizedPic) {
      return errorResponse(
        res,
        'Akses ditolak: Hanya Penanggung Jawab (PIC) yang ditunjuk pada shift aktif yang berhak melaporkan kesiapan armada ini',
        403
      );
    }

    if (!picPersonnelId && req.user.personnel_id) {
      picPersonnelId = req.user.personnel_id;
    }

    let photoWebpUrl = null;
    if (req.file) {
      photoWebpUrl = `/uploads/${req.file.filename}`;
    }

    // Ambil log kesiapan saat ini
    const [existing] = await pool.query(
      `SELECT id, photo_webp_url FROM vehicle_readiness_logs
       WHERE vehicle_id = ? AND shift_date = ? AND shift_number = ? AND team_group = ?`,
      [vehicle_id, shift_date, shift_number, targetTeam]
    );

    const finalPhoto = photoWebpUrl || (existing.length > 0 ? existing[0].photo_webp_url : null);
    if (!finalPhoto) {
      return errorResponse(
        res,
        'Foto bukti fisik kelaikan armada wajib disertakan untuk verifikasi kondisi lapangan',
        400
      );
    }

    const resolvedAt = status === 'serviceable' && follow_up_status === 'resolved' ? new Date() : null;

    if (existing.length > 0) {
      await pool.query(
        `UPDATE vehicle_readiness_logs SET
          pic_personnel_id = COALESCE(?, pic_personnel_id),
          status = ?,
          justification = ?,
          photo_webp_url = ?,
          follow_up_status = ?,
          resolved_at = ?,
          notes = ?
         WHERE id = ?`,
        [
          picPersonnelId || null,
          status,
          status === 'unserviceable' ? justification : null,
          finalPhoto,
          follow_up_status,
          resolvedAt,
          notes || null,
          existing[0].id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO vehicle_readiness_logs (
          vehicle_id, shift_date, shift_number, team_group,
          pic_personnel_id, status, justification, photo_webp_url,
          follow_up_status, resolved_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vehicle_id,
          shift_date,
          shift_number,
          targetTeam,
          picPersonnelId,
          status,
          status === 'unserviceable' ? justification : null,
          finalPhoto,
          follow_up_status,
          resolvedAt,
          notes || null
        ]
      );
    }


    // Jika armada dinyatakan serviceable, tandai backlog unserviceable sebelumnya sebagai resolved
    if (status === 'serviceable') {
      await pool.query(
        `UPDATE vehicle_readiness_logs SET
           follow_up_status = 'resolved',
           resolved_at = CURRENT_TIMESTAMP
         WHERE vehicle_id = ? AND status = 'unserviceable' AND follow_up_status != 'resolved'`,
        [vehicle_id]
      );
    }

    const [updatedRow] = await pool.query(
      `SELECT vrl.*, v.code_name, v.vehicle_name, p.full_name as pic_name
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE vrl.vehicle_id = ? AND vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?`,
      [vehicle_id, shift_date, shift_number, targetTeam]
    );

    return successResponse(res, 'Status kesiapan armada berhasil disimpan', updatedRow[0]);
  } catch (error) {
    console.error('Error submitVehicleReadiness:', error);
    return errorResponse(res, 'Gagal menyimpan status kesiapan kendaraan: ' + error.message, 500);
  }
};

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
          notes = ?
         WHERE id = ?`,
        [status, inspectorPersonnelId, notes || null, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO vehicle_readiness_logs (
          vehicle_id, shift_date, shift_number, team_group, status, pic_personnel_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [wrId, shift_date, shift_number, targetTeam, status, inspectorPersonnelId, notes || null]
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
