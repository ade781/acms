import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';
import { calculateDefaultRoster } from './scheduleController.js';

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

    // Ambil data Section Head / Dept Head resmi
    const [deptHeads] = await pool.query(
      `SELECT u.name, p.nip, p.rank_position, COALESCE(u.signature_url, p.signature_url) as signature_url
       FROM users u
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE u.role IN ('dept_head', 'admin')
       ORDER BY FIELD(u.role, 'dept_head', 'admin')
       LIMIT 1`
    );
    const deptHeadData = deptHeads.length > 0 ? deptHeads[0] : null;

    if (shifts.length === 0) {
      return successResponse(res, 'Sesi shift belum dibuat, form ploting dimulai dari kondisi kosong', {
        shift: null,
        shift_date: shiftDate,
        shift_number: shiftNumber,
        team_group: team_group || null,
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

    // Sanitasi: Jika personel ditandai 'absent', lepaskan dari penugasan kendaraan operasional
    const absentIds = new Set(
      deployments
        .filter(d => d.deployment_type === 'absent' && d.personnel_id)
        .map(d => Number(d.personnel_id))
    );

    const rawDeployments = deployments.filter(d => {
      if (d.deployment_type !== 'absent' && absentIds.has(Number(d.personnel_id))) {
        return false;
      }
      return true;
    });

    // Validasi: Cegah duplikasi penugasan (satu personel tidak boleh bertugas di >1 unit atau bertugas sekaligus cuti)
    const assignedPersonnelIds = new Set();
    for (const d of rawDeployments) {
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

    for (const d of rawDeployments) {
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

    // 2. Hapus ploting lama pada shift ini dan masukkan yang baru
    await connection.query('DELETE FROM personnel_deployments WHERE shift_id = ?', [shiftId]);

    const vehiclePics = {};

    for (const d of rawDeployments) {
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

export const requestLeaveRange = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { personnel_id, start_date, end_date, absent_reason = 'cuti', notes } = req.body;

    if (!start_date || !end_date) {
      connection.release();
      return errorResponse(res, 'Tanggal mulai dan tanggal selesai cuti wajib diisi', 400);
    }

    const isPrivileged = ['admin', 'supervisor', 'chief', 'chief_assistant', 'dept_head'].includes(req.user.role);
    let targetPersonnelId = Number(personnel_id);

    if (!isPrivileged) {
      if (!req.user.personnel_id) {
        connection.release();
        return errorResponse(res, 'Akun Anda tidak terhubung dengan data personel operasional', 403);
      }
      targetPersonnelId = Number(req.user.personnel_id);
    } else {
      if (!targetPersonnelId) {
        targetPersonnelId = Number(req.user.personnel_id);
      }
    }

    if (!targetPersonnelId) {
      connection.release();
      return errorResponse(res, 'ID Personel tidak valid', 400);
    }

    const [pRows] = await connection.query('SELECT * FROM personnel WHERE id = ?', [targetPersonnelId]);
    if (pRows.length === 0) {
      connection.release();
      return errorResponse(res, 'Data personel tidak ditemukan', 404);
    }
    const person = pRows[0];
    const teamGroup = person.team_group || 'Alpha';

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    if (startDateObj > endDateObj) {
      connection.release();
      return errorResponse(res, 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai', 400);
    }

    await connection.beginTransaction();

    // Jika ada lampiran berkas dokumen bukti cuti (opsional)
    let uploadedDocUrl = null;
    if (req.file) {
      uploadedDocUrl = `/uploads/${req.file.filename}`;
      const docTitle = `Bukti Cuti (${absent_reason.toUpperCase()} ${start_date} s/d ${end_date})`;
      const fileName = req.file.originalname || req.file.filename;
      const fileSize = req.file.size || 0;
      const mimeType = req.file.mimetype || 'application/octet-stream';

      await connection.query(
        `INSERT INTO personnel_documents (
          personnel_id, title, document_type, file_name, file_url, file_size, mime_type, uploaded_by
        ) VALUES (?, ?, 'dokumen_lain', ?, ?, ?, ?, ?)`,
        [
          targetPersonnelId,
          docTitle,
          fileName,
          uploadedDocUrl,
          fileSize,
          mimeType,
          req.user.id
        ]
      );
    }

    let cur = new Date(startDateObj);
    let daysCount = 0;

    while (cur <= endDateObj) {
      const curDateStr = cur.toISOString().split('T')[0];
      const roster = calculateDefaultRoster(curDateStr);

      let shiftNum = 1;
      if (roster.shift_1 === teamGroup) shiftNum = 1;
      else if (roster.shift_2 === teamGroup) shiftNum = 2;
      else if (roster.shift_3 === teamGroup) shiftNum = 3;
      else shiftNum = 1; // regu libur, tetap dicatat di shift 1 agar terekam

      // Pastikan personnel_shifts ada
      const [exShifts] = await connection.query(
        'SELECT id FROM personnel_shifts WHERE shift_date = ? AND shift_number = ? AND team_group = ?',
        [curDateStr, shiftNum, teamGroup]
      );

      let shiftId;
      if (exShifts.length > 0) {
        shiftId = exShifts[0].id;
      } else {
        const [ins] = await connection.query(
          `INSERT INTO personnel_shifts (shift_date, shift_number, team_group, status)
           VALUES (?, ?, ?, 'open')`,
          [curDateStr, shiftNum, teamGroup]
        );
        shiftId = ins.insertId;
      }

      // Hapus ploting lama personel pada shift ini (jika sebelumnya sudah terploting di unit)
      await connection.query(
        'DELETE FROM personnel_deployments WHERE shift_id = ? AND personnel_id = ?',
        [shiftId, targetPersonnelId]
      );

      // Masukkan entri absent
      const noteText = notes
        ? `${notes} (Rentang: ${start_date} s/d ${end_date})`
        : `Pengajuan Cuti (${start_date} s/d ${end_date})`;

      await connection.query(
        `INSERT INTO personnel_deployments (
          shift_id, personnel_id, deployment_type, is_pic, absent_reason, assigned_by, notes
        ) VALUES (?, ?, 'absent', 0, ?, ?, ?)`,
        [shiftId, targetPersonnelId, absent_reason, req.user.id, noteText]
      );

      daysCount++;
      cur.setDate(cur.getDate() + 1);
    }

    await connection.commit();

    return successResponse(res, `Pengajuan cuti untuk ${person.full_name} berhasil dicatat sebanyak ${daysCount} hari.`, {
      personnel_id: targetPersonnelId,
      full_name: person.full_name,
      start_date,
      end_date,
      days_count: daysCount,
      document_url: uploadedDocUrl
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error requestLeaveRange:', error);
    return errorResponse(res, 'Gagal mencatat pengajuan cuti: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

export const cancelLeave = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const deploymentId = req.params.id || req.body.deployment_id;
    const { personnel_id, shift_id, shift_date, shift_number } = req.body;

    const isPrivileged = ['admin', 'supervisor', 'chief', 'chief_assistant', 'dept_head'].includes(req.user.role);
    const targetPersonnelId = (isPrivileged && personnel_id) ? Number(personnel_id) : (req.user.personnel_id ? Number(req.user.personnel_id) : null);

    let query = '';
    let params = [];

    if (deploymentId) {
      if (isPrivileged) {
        query = 'DELETE FROM personnel_deployments WHERE id = ? AND deployment_type = "absent"';
        params = [deploymentId];
      } else {
        query = 'DELETE FROM personnel_deployments WHERE id = ? AND personnel_id = ? AND deployment_type = "absent"';
        params = [deploymentId, req.user.personnel_id];
      }
    } else if (targetPersonnelId && shift_id) {
      query = 'DELETE FROM personnel_deployments WHERE shift_id = ? AND personnel_id = ? AND deployment_type = "absent"';
      params = [shift_id, targetPersonnelId];
    } else if (targetPersonnelId && shift_date) {
      const shiftNum = shift_number ? Number(shift_number) : 1;
      const [shifts] = await connection.query(
        'SELECT id FROM personnel_shifts WHERE shift_date = ? AND shift_number = ?',
        [shift_date, shiftNum]
      );
      if (shifts.length === 0) {
        connection.release();
        return errorResponse(res, 'Sesi shift tidak ditemukan', 404);
      }
      query = 'DELETE FROM personnel_deployments WHERE shift_id = ? AND personnel_id = ? AND deployment_type = "absent"';
      params = [shifts[0].id, targetPersonnelId];
    } else {
      connection.release();
      return errorResponse(res, 'Data identitas cuti yang akan dibatalkan tidak lengkap', 400);
    }

    const [result] = await connection.query(query, params);
    connection.release();

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Data izin/cuti tidak ditemukan atau Anda tidak memiliki akses untuk membatalkannya', 404);
    }

    return successResponse(res, 'Pengajuan cuti berhasil dibatalkan. Personel dikembalikan ke status aktif berdinas.', {
      affectedRows: result.affectedRows
    });
  } catch (error) {
    connection.release();
    console.error('Error cancelLeave:', error);
    return errorResponse(res, 'Gagal membatalkan cuti: ' + error.message, 500);
  }
};
