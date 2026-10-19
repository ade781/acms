import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';

export const getCurrentDeployment = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;

    let shiftQuery = `
      SELECT ps.*, u.name as supervisor_name
      FROM personnel_shifts ps
      LEFT JOIN users u ON u.id = ps.supervisor_id
      WHERE ps.shift_date = ? AND ps.shift_number = ?
    `;
    const shiftParams = [shiftDate, shiftNumber];

    if (team_group) {
      shiftQuery += ` AND ps.team_group = ?`;
      shiftParams.push(team_group);
    }

    const [shifts] = await pool.query(shiftQuery, shiftParams);

    if (shifts.length === 0) {
      return successResponse(res, 'Sesi shift belum dibuat, form ploting dimulai dari kondisi kosong', {
        shift: null,
        shift_date: shiftDate,
        shift_number: shiftNumber,
        team_group: team_group || null,
        deployments: [],
        vehicles: [],
        watchroom: [],
        absents: []
      });
    }

    const currentShift = shifts[0];

    const [deployments] = await pool.query(
      `SELECT pd.*,
              p.nip, p.full_name, p.rank_position, p.cert_level, p.team_group as personnel_team,
              v.code_name as vehicle_code, v.vehicle_name, v.category as vehicle_category
       FROM personnel_deployments pd
       JOIN personnel p ON p.id = pd.personnel_id
       LEFT JOIN vehicles v ON v.id = pd.vehicle_id
       WHERE pd.shift_id = ?
       ORDER BY pd.deployment_type ASC, pd.vehicle_id ASC, pd.is_pic DESC, p.full_name ASC`,
      [currentShift.id]
    );

    // Pengelompokan ploting
    const vehicleDeploymentsMap = {};
    const watchroomDeployments = [];
    const absentDeployments = [];

    deployments.forEach(item => {
      if (item.deployment_type === 'vehicle_utama' || item.deployment_type === 'vehicle_pendukung') {
        const vId = item.vehicle_id;
        if (!vehicleDeploymentsMap[vId]) {
          vehicleDeploymentsMap[vId] = {
            vehicle_id: vId,
            vehicle_code: item.vehicle_code,
            vehicle_name: item.vehicle_name,
            category: item.vehicle_category,
            pic: null,
            crew: []
          };
        }
        if (item.is_pic === 1) {
          vehicleDeploymentsMap[vId].pic = item;
        }
        vehicleDeploymentsMap[vId].crew.push(item);
      } else if (item.deployment_type === 'watchroom') {
        watchroomDeployments.push(item);
      } else if (item.deployment_type === 'absent') {
        absentDeployments.push(item);
      }
    });

    return successResponse(res, 'Data ploting shift berhasil diambil', {
      shift: currentShift,
      vehicles: Object.values(vehicleDeploymentsMap),
      watchroom: watchroomDeployments,
      absents: absentDeployments,
      deployments
    });
  } catch (error) {
    console.error('Error getCurrentDeployment:', error);
    return errorResponse(res, 'Gagal mengambil data ploting shift', 500);
  }
};

export const saveDeploymentBatch = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      shift_date,
      shift_number,
      team_group,
      supervisor_id,
      handover_notes,
      deployments = []
    } = req.body;

    if (!shift_date || !shift_number || !team_group) {
      return errorResponse(res, 'Tanggal shift, nomor shift, dan regu dinas wajib diisi', 400);
    }

    const validTeams = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    if (!validTeams.includes(team_group)) {
      return errorResponse(res, 'Regu dinas harus salah satu dari: Alpha, Bravo, Charlie, Delta', 400);
    }

    // Validasi aturan: Ploting kendaraan menampung 3 s.d. 4 personel per kendaraan, dengan tepat 1 personel ditandai is_pic = 1
    const vehicleCrewCount = {};
    const vehiclePicCount = {};

    for (const d of deployments) {
      if (d.deployment_type === 'vehicle_utama' || d.deployment_type === 'vehicle_pendukung') {
        if (!d.vehicle_id) {
          return errorResponse(res, 'Penempatan kendaraan wajib menyertakan vehicle_id', 400);
        }
        vehicleCrewCount[d.vehicle_id] = (vehicleCrewCount[d.vehicle_id] || 0) + 1;
        if (d.is_pic) {
          vehiclePicCount[d.vehicle_id] = (vehiclePicCount[d.vehicle_id] || 0) + 1;
        }
      }
    }

    for (const [vId, count] of Object.entries(vehicleCrewCount)) {
      if (count < 3 || count > 4) {
        return errorResponse(
          res,
          `Kendaraan ID ${vId} memiliki ${count} kru. Sesuai aturan operasional, setiap armada wajib beranggotakan 3 s.d. 4 personel.`,
          400
        );
      }
      const picCount = vehiclePicCount[vId] || 0;
      if (picCount !== 1) {
        return errorResponse(
          res,
          `Kendaraan ID ${vId} memiliki ${picCount} PIC. Tepat 1 personel harus ditunjuk sebagai Penanggung Jawab (PIC).`,
          400
        );
      }
    }

    await connection.beginTransaction();

    // 1. Buat atau perbarui entri personnel_shifts
    const [existingShifts] = await connection.query(
      `SELECT id, status FROM personnel_shifts
       WHERE shift_date = ? AND shift_number = ? AND team_group = ?`,
      [shift_date, shift_number, team_group]
    );

    let shiftId;
    const supId = supervisor_id || req.user.id;

    if (existingShifts.length > 0) {
      shiftId = existingShifts[0].id;
      await connection.query(
        `UPDATE personnel_shifts SET
          supervisor_id = ?,
          handover_notes = COALESCE(?, handover_notes)
         WHERE id = ?`,
        [supId, handover_notes, shiftId]
      );
    } else {
      const [insertShift] = await connection.query(
        `INSERT INTO personnel_shifts (shift_date, shift_number, team_group, supervisor_id, status, handover_notes)
         VALUES (?, ?, ?, ?, 'open', ?)`,
        [shift_date, shift_number, team_group, supId, handover_notes || null]
      );
      shiftId = insertShift.insertId;
    }

    // 2. Hapus ploting lama pada shift ini dan masukkan yang baru
    await connection.query('DELETE FROM personnel_deployments WHERE shift_id = ?', [shiftId]);

    const vehiclePics = {};

    for (const d of deployments) {
      const isPicVal = d.is_pic ? 1 : 0;
      await connection.query(
        `INSERT INTO personnel_deployments (
          shift_id, personnel_id, deployment_type, vehicle_id,
          is_pic, absent_reason, assigned_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shiftId,
          d.personnel_id,
          d.deployment_type,
          d.vehicle_id || null,
          isPicVal,
          d.absent_reason || null,
          req.user.id,
          d.notes || null
        ]
      );

      if (isPicVal && d.vehicle_id) {
        vehiclePics[d.vehicle_id] = d.personnel_id;
      }
    }

    // 3. Sinkronisasikan baris vehicle_readiness_logs agar PIC tercatat
    for (const [vId, picPersonnelId] of Object.entries(vehiclePics)) {
      const [existingVLog] = await connection.query(
        `SELECT id FROM vehicle_readiness_logs
         WHERE vehicle_id = ? AND shift_date = ? AND shift_number = ?`,
        [vId, shift_date, shift_number]
      );

      if (existingVLog.length > 0) {
        await connection.query(
          `UPDATE vehicle_readiness_logs SET
            pic_personnel_id = ?,
            team_group = ?
           WHERE id = ?`,
          [picPersonnelId, team_group, existingVLog[0].id]
        );
      } else {
        await connection.query(
          `INSERT INTO vehicle_readiness_logs (
            vehicle_id, shift_date, shift_number, team_group,
            pic_personnel_id, status, follow_up_status
          ) VALUES (?, ?, ?, ?, ?, 'belum_dilaporkan', 'pending')`,
          [vId, shift_date, shift_number, team_group, picPersonnelId]
        );
      }
    }

    await connection.commit();

    return successResponse(res, 'Ploting personel dinas shift berhasil disimpan', {
      shift_id: shiftId,
      total_personnel_assigned: deployments.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error saveDeploymentBatch:', error);
    return errorResponse(res, 'Gagal menyimpan ploting personel: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

export const approveShift = async (req, res) => {
  try {
    const { shift_id, shift_date, shift_number, team_group } = req.body;

    let targetShiftId = shift_id;

    if (!targetShiftId) {
      if (!shift_date || !shift_number || !team_group) {
        return errorResponse(res, 'Sertakan shift_id atau kombinasi shift_date, shift_number, dan team_group', 400);
      }
      const [find] = await pool.query(
        'SELECT id FROM personnel_shifts WHERE shift_date = ? AND shift_number = ? AND team_group = ?',
        [shift_date, shift_number, team_group]
      );
      if (find.length === 0) {
        return errorResponse(res, 'Sesi shift tidak ditemukan', 404);
      }
      targetShiftId = find[0].id;
    }

    const [rows] = await pool.query('SELECT * FROM personnel_shifts WHERE id = ?', [targetShiftId]);
    if (rows.length === 0) {
      return errorResponse(res, 'Sesi shift tidak ditemukan', 404);
    }

    await pool.query(
      `UPDATE personnel_shifts SET
        status = 'approved',
        supervisor_id = ?,
        approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, targetShiftId]
    );

    const [updated] = await pool.query('SELECT * FROM personnel_shifts WHERE id = ?', [targetShiftId]);

    return successResponse(res, 'Laporan shift dinas berhasil disahkan (Approved)', updated[0]);
  } catch (error) {
    console.error('Error approveShift:', error);
    return errorResponse(res, 'Gagal mengesahkan laporan shift', 500);
  }
};
