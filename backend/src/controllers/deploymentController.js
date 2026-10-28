import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';
import { calculateDefaultRoster } from './scheduleController.js';
import { clearPdfCache } from '../services/pdfService.js';
import { getOfficialSignatory } from '../utils/officialHelper.js';
import { cleanTeam } from '../utils/roleMapper.js';

export const getCurrentDeployment = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;

    let shiftQuery = `
      SELECT ps.*, u.name as supervisor_name, p.nip as supervisor_nip, COALESCE(u.signature_url, p.signature_url) as supervisor_signature_url
      FROM personnel_shifts ps
      LEFT JOIN users u ON u.id = ps.supervisor_id
      LEFT JOIN personnel p ON p.user_id = u.id
      WHERE ps.shift_date = ? AND ps.shift_number = ?
    `;
    const shiftParams = [shiftDate, shiftNumber];

    if (team_group) {
      shiftQuery += ` AND ps.team_group = ?`;
      shiftParams.push(team_group);
    }

    const [shifts] = await pool.query(shiftQuery, shiftParams);

    // Ambil data Section Head / Dept Head resmi via utilitas terpadu
    const deptHeadData = await getOfficialSignatory(pool);
    const targetTeam = cleanTeam(team_group || (shifts.length > 0 ? shifts[0].team_group : 'Alpha'));
    const [teamCountRows] = await pool.query('SELECT COUNT(*) as total_team_members FROM personnel WHERE team_group = ? AND is_active = 1', [targetTeam]);
    const totalTeamMembers = Number(teamCountRows[0]?.total_team_members || 0);

    if (shifts.length === 0) {
      return successResponse(res, 'Sesi shift belum dibuat, form ploting dimulai dari kondisi kosong', {
        shift: null,
        shift_date: shiftDate,
        shift_number: shiftNumber,
        team_group: team_group || null,
        total_team_members: totalTeamMembers,
        dept_head: deptHeadData,
        deployments: [],
        vehicles: [],
        watchroom: [],
        absents: []
      });
    }

    const currentShift = shifts[0];

    // Jika supervisor belum tercatat di sesi shift, cari Ketua Regu sah untuk regu tersebut
    if (!currentShift.supervisor_name && currentShift.team_group) {
      const [teamChiefs] = await pool.query(
        `SELECT u.name as supervisor_name, p.nip as supervisor_nip, COALESCE(u.signature_url, p.signature_url) as supervisor_signature_url
         FROM personnel p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.team_group = ?
           AND (u.role IN ('chief', 'supervisor') OR p.rank_position LIKE '%Chief%' OR p.rank_position LIKE '%Ketua%')
           AND p.rank_position NOT LIKE '%Assistant%'
           AND p.rank_position NOT LIKE '%Asisten%'
           AND p.rank_position NOT LIKE '%Wakil%'
           AND (u.role IS NULL OR u.role != 'chief_assistant')
         ORDER BY p.id ASC
         LIMIT 1`,
        [currentShift.team_group]
      );
      if (teamChiefs.length > 0) {
        currentShift.supervisor_name = teamChiefs[0].supervisor_name;
        currentShift.supervisor_nip = teamChiefs[0].supervisor_nip;
        currentShift.supervisor_signature_url = teamChiefs[0].supervisor_signature_url;
      }
    }

    const [deployments] = await pool.query(
      `SELECT pd.*,
              p.nip, p.full_name, p.rank_position, p.employment_status, p.cert_level, p.team_group as personnel_team,
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
      total_team_members: totalTeamMembers,
      dept_head: deptHeadData,
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
      connection.release();
      return errorResponse(res, 'Tanggal shift, nomor shift, dan regu dinas wajib diisi', 400);
    }

    const validTeams = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    if (!validTeams.includes(team_group)) {
      connection.release();
      return errorResponse(res, 'Regu dinas harus salah satu dari: Alpha, Bravo, Charlie, Delta', 400);
    }

    // Validasi Otorisasi Shift: Jika bukan admin atau dept_head, pastikan hanya regu berdinas yang boleh memploting
    const isSuperRole = ['admin', 'dept_head'].includes(req.user?.role);
    if (!isSuperRole) {
      const roster = calculateDefaultRoster(shift_date);
      const scheduledTeam = shift_number == 1 ? roster.shift_1 : (shift_number == 2 ? roster.shift_2 : roster.shift_3);
      if (scheduledTeam && team_group.toLowerCase() !== scheduledTeam.toLowerCase()) {
        connection.release();
        return errorResponse(
          res,
          `Akses ditolak: Regu ${team_group} sedang tidak bertugas aktif (libur/off) pada tanggal ${shift_date} Shift ${shift_number}. Operasional shift ini dipimpin oleh Regu ${scheduledTeam}.`,
          403
        );
      }
      if (req.user?.team_group && req.user.team_group.toLowerCase() !== team_group.toLowerCase()) {
        connection.release();
        return errorResponse(
          res,
          `Akses ditolak: Anda terdaftar di Regu ${req.user.team_group} dan tidak berwenang memploting Regu ${team_group}.`,
          403
        );
      }
    }

    // Validasi Integritas: Kumpulkan personel yang berstatus absent dalam shift ini
    const absentIds = new Set(
      deployments
        .filter(d => d.deployment_type === 'absent' && d.personnel_id)
        .map(d => Number(d.personnel_id))
    );

    // Cek apakah ada personel yang berstatus absent namun juga ditugaskan pada unit kendaraan/posko
    for (const d of deployments) {
      if (d.deployment_type !== 'absent' && d.personnel_id && absentIds.has(Number(d.personnel_id))) {
        connection.release();
        return errorResponse(
          res,
          `Personel (ID: ${d.personnel_id}) tercatat berstatus izin/cuti aktif pada shift ini. Batalkan pengajuan cuti terlebih dahulu sebelum menugaskan pada unit operasional.`,
          400
        );
      }
    }

    // Validasi Anti-Tabrakan Slot: Cegah duplikasi penugasan (satu personel tidak boleh bertugas di >1 unit atau bertugas ganda)
    const assignedPersonnelIds = new Set();
    for (const d of deployments) {
      if (!d.personnel_id) continue;
      const pId = Number(d.personnel_id);
      if (assignedPersonnelIds.has(pId)) {
        connection.release();
        return errorResponse(
          res,
          `Personel (ID: ${pId}) ditugaskan lebih dari satu kali pada shift ini. Satu anggota hanya boleh ditugaskan pada 1 kendaraan atau berstatus izin/cuti.`,
          400
        );
      }
      assignedPersonnelIds.add(pId);
    }

    // Validasi aturan: Setiap unit operasional yang ditugaskan wajib memiliki tepat 1 PIC dan maksimal 4 personel
    const unitCrewCount = {};
    const unitPicCount = {};

    for (const d of deployments) {
      if (d.deployment_type === 'vehicle_utama' || d.deployment_type === 'vehicle_pendukung' || d.deployment_type === 'watchroom') {
        if (d.vehicle_id) {
          unitCrewCount[d.vehicle_id] = (unitCrewCount[d.vehicle_id] || 0) + 1;
          if (d.is_pic) {
            unitPicCount[d.vehicle_id] = (unitPicCount[d.vehicle_id] || 0) + 1;
          }
        }
      }
    }

    const unitIds = Object.keys(unitCrewCount);
    let vehicleNamesMap = {};
    if (unitIds.length > 0) {
      const [vList] = await connection.query(
        'SELECT id, code_name, vehicle_name FROM vehicles WHERE id IN (?)',
        [unitIds]
      );
      vList.forEach(v => {
        vehicleNamesMap[v.id] = v.code_name || v.vehicle_name || `Unit ID ${v.id}`;
      });
    }

    for (const [vId, count] of Object.entries(unitCrewCount)) {
      const unitName = vehicleNamesMap[vId] || `Unit ID ${vId}`;
      if (count > 4) {
        connection.release();
        return errorResponse(
          res,
          `Unit ${unitName} memiliki ${count} kru (maksimal 4 personel per unit).`,
          400
        );
      }
      const picCount = unitPicCount[vId] || 0;
      if (picCount === 0) {
        connection.release();
        return errorResponse(
          res,
          `Unit ${unitName} belum memiliki Penanggung Jawab (PIC). Silakan tunjuk tepat 1 PIC untuk unit ini.`,
          400
        );
      }
      if (picCount > 1) {
        connection.release();
        return errorResponse(
          res,
          `Unit ${unitName} memiliki ${picCount} PIC. Tepat 1 personel wajib ditunjuk sebagai Penanggung Jawab (PIC).`,
          400
        );
      }
    }

    await connection.beginTransaction();

    // 1. Buat atau perbarui entri personnel_shifts
    const [existingShifts] = await connection.query(
      `SELECT id, supervisor_id, status FROM personnel_shifts
       WHERE shift_date = ? AND shift_number = ? AND team_group = ?`,
      [shift_date, shift_number, team_group]
    );

    let shiftId;
    let supId = supervisor_id || null;

    if (existingShifts.length > 0 && !supId) {
      supId = existingShifts[0].supervisor_id;
    }

    if (!supId) {
      // Cari supervisor sah / Ketua Regu dari database untuk team_group ini
      const [chiefRows] = await connection.query(
        `SELECT p.user_id, u.id as direct_user_id
         FROM personnel p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.team_group = ?
           AND (u.role IN ('chief', 'supervisor') OR p.rank_position LIKE '%Chief%' OR p.rank_position LIKE '%Ketua%')
           AND p.rank_position NOT LIKE '%Assistant%'
           AND p.rank_position NOT LIKE '%Asisten%'
           AND p.rank_position NOT LIKE '%Wakil%'
           AND (u.role IS NULL OR u.role != 'chief_assistant')
         ORDER BY p.id ASC
         LIMIT 1`,
        [team_group]
      );
      if (chiefRows.length > 0) {
        supId = chiefRows[0].user_id || chiefRows[0].direct_user_id || null;
      }
    }

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

    // 2. Validasi Integritas Backend: Cegah satu personel bertugas ganda pada lebih dari satu armada
    const activeAssignedSet = new Set();
    for (const d of deployments) {
      if (d.deployment_type !== 'absent' && d.personnel_id) {
        const pId = Number(d.personnel_id);
        if (activeAssignedSet.has(pId)) {
          await connection.rollback();
          return errorResponse(res, `Pelanggaran Integritas: Personel ID #${pId} terdeteksi ditugaskan ganda pada lebih dari satu armada operasional.`, 400);
        }
        activeAssignedSet.add(pId);
      }
    }

    // 3. Hapus HANYA ploting armada dan watchroom lama pada shift ini (JANGAN sentuh entri cuti/absent)
    await connection.query(
      "DELETE FROM personnel_deployments WHERE shift_id = ? AND deployment_type IN ('vehicle_utama', 'vehicle_pendukung', 'watchroom')",
      [shiftId]
    );

    const vehiclePics = {};

    for (const d of deployments) {
      if (d.deployment_type === 'absent') {
        // Jangan duplikasi entri absent yang sudah tercatat
        const [existingAbsent] = await connection.query(
          'SELECT id FROM personnel_deployments WHERE shift_id = ? AND personnel_id = ? AND deployment_type = "absent"',
          [shiftId, d.personnel_id]
        );
        if (existingAbsent.length === 0) {
          await connection.query(
            `INSERT INTO personnel_deployments (
              shift_id, personnel_id, deployment_type, vehicle_id,
              is_pic, absent_reason, assigned_by, notes
            ) VALUES (?, ?, 'absent', NULL, 0, ?, ?, ?)`,
            [shiftId, d.personnel_id, d.absent_reason || 'cuti', req.user?.id || null, d.notes || null]
          );
        }
        continue;
      }

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
          req.user?.id || null,
          d.notes || null
        ]
      );

      if (isPicVal && d.vehicle_id) {
        vehiclePics[d.vehicle_id] = d.personnel_id;
      }
    }

    // 4. Sinkronisasikan baris vehicle_readiness_logs agar PIC tercatat secara presisi
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

    // Lepaskan PIC pada unit yang tidak lagi memiliki PIC di shift ini
    const assignedVehicleIds = Object.keys(vehiclePics);
    if (assignedVehicleIds.length > 0) {
      await connection.query(
        `UPDATE vehicle_readiness_logs SET
          pic_personnel_id = NULL
         WHERE shift_date = ? AND shift_number = ? AND vehicle_id NOT IN (?)`,
        [shift_date, shift_number, assignedVehicleIds]
      );
    } else {
      await connection.query(
        `UPDATE vehicle_readiness_logs SET
          pic_personnel_id = NULL
         WHERE shift_date = ? AND shift_number = ?`,
        [shift_date, shift_number]
      );
    }

    await connection.commit();
    clearPdfCache();

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

export const saveDeployment = saveDeploymentBatch;
export const getCurrentDeployments = getCurrentDeployment;
export const saveDeployments = saveDeploymentBatch;

// Re-export domain perizinan cuti dari leaveController.js untuk menjamin 100% backward compatibility
export {
  requestLeaveRange,
  cancelLeave,
  getLeaveHistory,
  submitLeave
} from './leaveController.js';


