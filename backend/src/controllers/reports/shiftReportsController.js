import pool from '../../config/db.js';
import {
  generateShiftReportPdf,
  getPdfCache,
  setPdfCache,
} from '../../services/pdfService.js';
import { errorResponse } from '../../utils/responseHelper.js';
import { getOfficialSignatory } from '../../utils/officialHelper.js';
import { fetchVehicleIssuesAuditData } from './vehicleReportsController.js';

export const getShiftReportPdf = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = Math.min(Math.max(parseInt(shift, 10) || 1, 1), 3);
    const ALLOWED_TEAMS = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    const rawTeam = (team_group || 'Alpha').replace(/^(Regu\s+|Team\s+)/i, '').trim();
    const matchedTeam = ALLOWED_TEAMS.find((t) => t.toLowerCase() === rawTeam.toLowerCase());
    const teamGroup = matchedTeam || 'Alpha';

    // Eksekusi data dinas shift resmi laporan A4
    const [shifts] = await pool.query(
      `SELECT ps.*, u.name as supervisor_name, u.signature_url as user_sig, p.signature_url as pers_sig, p.nip as supervisor_nip
       FROM personnel_shifts ps
       LEFT JOIN users u ON u.id = ps.supervisor_id
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE ps.shift_date = ? AND ps.shift_number = ? AND ps.team_group = ?`,
      [shiftDate, shiftNumber, teamGroup]
    );

    const shiftData = shifts.length > 0 ? shifts[0] : {
      shift_date: shiftDate,
      shift_number: shiftNumber,
      team_group: teamGroup,
      supervisor_name: null,
      supervisor_nip: null,
      supervisor_signature_url: null,
      status: 'open'
    };

    // 1. Cek In-Memory Cache PDF (termasuk status shift untuk mencegah drift data draf vs final)
    const cacheKey = `shift_report_${shiftDate}_${shiftNumber}_${teamGroup}_${shiftData.status || 'open'}`;
    const cachedBuffer = getPdfCache(cacheKey);
    if (cachedBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="laporan-shift-${shiftNumber}-${teamGroup}-${shiftDate}.pdf"`
      );
      return res.send(cachedBuffer);
    }

    // Ambil identitas Ketua Regu / Supervisor dinas secara dinamis dari database
    let supervisorName = shiftData?.supervisor_name || null;
    let supervisorNip = shiftData?.supervisor_nip || null;
    let supervisorSignatureUrl = shiftData?.pers_sig || shiftData?.user_sig || null;

    if (!supervisorName) {
      const [teamChiefs] = await pool.query(
        `SELECT p.full_name, p.nip, COALESCE(u.signature_url, p.signature_url) as signature_url
         FROM personnel p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE (u.role IN ('chief', 'supervisor') OR p.rank_position LIKE '%Chief%' OR p.rank_position LIKE '%Ketua%')
           AND p.rank_position NOT LIKE '%Assistant%'
           AND p.rank_position NOT LIKE '%Asisten%'
           AND p.rank_position NOT LIKE '%Wakil%'
           AND (u.role IS NULL OR u.role != 'chief_assistant')
           AND p.team_group = ?
         ORDER BY p.id ASC
         LIMIT 1`,
        [teamGroup]
      );
      if (teamChiefs.length > 0) {
        supervisorName = teamChiefs[0].full_name;
        supervisorNip = teamChiefs[0].nip;
        supervisorSignatureUrl = teamChiefs[0].signature_url;
      } else {
        // Fallback dinamis: Cari personil paling senior di regu tersebut dari database (bukan hardcoded)
        const [seniorMembers] = await pool.query(
          `SELECT p.full_name, p.nip, COALESCE(u.signature_url, p.signature_url) as signature_url
           FROM personnel p
           LEFT JOIN users u ON u.id = p.user_id
           WHERE p.team_group = ? AND p.is_active = 1
           ORDER BY FIELD(p.cert_level, 'Senior', 'Junior', 'Basic'), p.id ASC
           LIMIT 1`,
          [teamGroup]
        );
        if (seniorMembers.length > 0) {
          supervisorName = seniorMembers[0].full_name;
          supervisorNip = seniorMembers[0].nip;
          supervisorSignatureUrl = seniorMembers[0].signature_url;
        } else {
          supervisorName = `Ketua Regu ${teamGroup}`;
        }
      }
    }

    // Ambil data pejabat Section Head / Dept Head secara dinamis dari database
    const deptHeadData = await getOfficialSignatory(pool);

    // Ambil data kesiapan kendaraan & PIC ploting resmi shift (7 armada pemadam murni)
    const [vehicles] = await pool.query(
      `SELECT v.code_name, v.vehicle_name, v.category, vrl.status, vrl.justification,
              COALESCE(deploy_pic.full_name, p.full_name) as pic_name
       FROM vehicles v
       LEFT JOIN vehicle_readiness_logs vrl
         ON vrl.vehicle_id = v.id AND vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
       LEFT JOIN (
         SELECT pd.vehicle_id, p.full_name
         FROM personnel_deployments pd
         JOIN personnel_shifts ps ON ps.id = pd.shift_id
         JOIN personnel p ON p.id = pd.personnel_id
         WHERE ps.shift_date = ? AND ps.shift_number = ? AND ps.team_group = ? AND pd.is_pic = 1
       ) deploy_pic ON deploy_pic.vehicle_id = v.id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE v.is_active = 1 AND v.category != 'posko' AND v.code_name != 'WATCHROOM'`,
      [shiftDate, shiftNumber, teamGroup, shiftDate, shiftNumber, teamGroup]
    );

    // Ambil kesiapan watchroom dari vehicle_readiness_logs
    const [watchrooms] = await pool.query(
      `SELECT vrl.status, vrl.notes, p.full_name as inspector_name
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE (v.category = 'posko' OR v.code_name = 'WATCHROOM')
         AND vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
       LIMIT 1`,
      [shiftDate, shiftNumber, teamGroup]
    );

    // Ambil ploting personel & absensi
    let deployments = [];
    let absents = [];

    if (shifts.length > 0) {
      const [deps] = await pool.query(
        `SELECT pd.*, p.full_name, p.nip, p.rank_position
         FROM personnel_deployments pd
         JOIN personnel p ON p.id = pd.personnel_id
         WHERE pd.shift_id = ?
         ORDER BY pd.deployment_type ASC, pd.is_pic DESC, p.full_name ASC`,
        [shifts[0].id]
      );
      deployments = deps;
      absents = deps.filter((d) => d.deployment_type === 'absent');
    }

    // Ambil juga personel dari regu ini yang tercatat cuti/izin pada tanggal ini
    const [teamAbsents] = await pool.query(
      `SELECT pd.*, p.full_name, p.nip, p.rank_position, pd.absent_reason, pd.notes
       FROM personnel_deployments pd
       JOIN personnel p ON p.id = pd.personnel_id
       JOIN personnel_shifts ps ON ps.id = pd.shift_id
       WHERE ps.shift_date = ? AND (p.team_group = ? OR ps.team_group = ?) AND pd.deployment_type = 'absent'`,
      [shiftDate, teamGroup, teamGroup]
    );

    const absentMap = new Map();
    absents.forEach((a) => absentMap.set(a.personnel_id, a));
    teamAbsents.forEach((a) => {
      if (!absentMap.has(a.personnel_id)) {
        absentMap.set(a.personnel_id, a);
      }
    });
    absents = Array.from(absentMap.values());

    // Ambil insiden (dikunci berdasarkan tanggal, shift_number, dan team_group)
    const [incidents] = await pool.query(
      `SELECT report_number, title, location, incident_time, action_taken
       FROM incidents
       WHERE incident_date = ? AND shift_number = ? AND team_group = ?`,
      [shiftDate, shiftNumber, teamGroup]
    );

    // Ambil aktivitas
    let activities = [];
    if (shifts.length > 0) {
      const [acts] = await pool.query(
        `SELECT activity_time, title, description
         FROM daily_shift_activities
         WHERE shift_id = ? ORDER BY activity_time ASC`,
        [shifts[0].id]
      );
      activities = acts;
    }

    const isShiftClosed = shiftData.status === 'closed';

    const reportPayload = {
      shift_date: shiftData.shift_date,
      shift_number: shiftData.shift_number,
      team_group: shiftData.team_group,
      supervisor_name: supervisorName,
      supervisor_nip: supervisorNip,
      supervisor_signature_url: supervisorSignatureUrl,
      dept_head_name: deptHeadData?.name || 'Section Head ARFF',
      dept_head_nip: deptHeadData?.nip || null,
      dept_head_signature_url: isShiftClosed ? (deptHeadData?.signature_url || null) : null,
      status: shiftData.status,
      vehicles,
      watchroom: watchrooms.length > 0 ? watchrooms[0] : {},
      deployments,
      absents,
      incidents,
      activities
    };

    const doc = await generateShiftReportPdf(reportPayload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="laporan-shift-${shiftNumber}-${teamGroup}-${shiftDate}.pdf"`
    );

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const resultBuffer = Buffer.concat(chunks);
      setPdfCache(cacheKey, resultBuffer);
    });

    doc.on('error', (err) => {
      console.error('PDFKit stream error (ShiftReportPdf):', err);
      if (!res.headersSent) {
        return errorResponse(res, 'Gagal menerbitkan laporan PDF: ' + err.message, 500);
      }
      res.destroy(err);
    });

    req.on('close', () => {
      if (!doc.destroyed && typeof doc.destroy === 'function') {
        doc.destroy();
      }
    });

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error getShiftReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF: ' + error.message, 500);
  }
};

/**
 * Endpoint agregasi terpadu ringkasan operasional shift (1 roundtrip HTTP)
 * Mengambil data shift, pejabat, kesiapan armada, watchroom, kendala unit, penugasan, absensi, insiden, dan kegiatan
 */
export const getShiftSummaryReport = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = Math.min(Math.max(parseInt(shift, 10) || 1, 1), 3);
    const ALLOWED_TEAMS = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    const rawTeam = (team_group || 'Alpha').replace(/^(Regu\s+|Team\s+)/i, '').trim();
    const matchedTeam = ALLOWED_TEAMS.find((t) => t.toLowerCase() === rawTeam.toLowerCase());
    const teamGroup = matchedTeam || 'Alpha';

    const [
      [shifts],
      deptHeadData,
      [allVehicles],
      [incidentsRaw],
      vehicleIssues
    ] = await Promise.all([
      pool.query(
        `SELECT ps.*, u.name as supervisor_name, u.signature_url as user_sig, p.signature_url as pers_sig, p.nip as supervisor_nip
         FROM personnel_shifts ps
         LEFT JOIN users u ON u.id = ps.supervisor_id
         LEFT JOIN personnel p ON p.user_id = u.id
         WHERE ps.shift_date = ? AND ps.shift_number = ? AND ps.team_group = ?`,
        [shiftDate, shiftNumber, teamGroup]
      ),
      getOfficialSignatory(pool),
      pool.query(
        `SELECT v.id, v.id as vehicle_id, v.code_name, v.vehicle_name, v.category, v.license_plate, v.description,
                vrl.id as log_id,
                COALESCE(vrl.status, 'belum_dilaporkan') as status,
                vrl.justification, vrl.photo_webp_url, vrl.follow_up_status, vrl.notes, vrl.updated_at as logged_at,
                COALESCE(deploy_pic.id, p_log.id) as pic_personnel_id,
                COALESCE(deploy_pic.full_name, p_log.full_name) as pic_name,
                COALESCE(deploy_pic.nip, p_log.nip) as pic_nip
         FROM vehicles v
         LEFT JOIN vehicle_readiness_logs vrl
           ON vrl.vehicle_id = v.id AND vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
         LEFT JOIN (
           SELECT pd.vehicle_id, p.id, p.full_name, p.nip
           FROM personnel_deployments pd
           JOIN personnel_shifts ps ON ps.id = pd.shift_id
           JOIN personnel p ON p.id = pd.personnel_id
           WHERE ps.shift_date = ? AND ps.shift_number = ? AND ps.team_group = ? AND pd.is_pic = 1
         ) deploy_pic ON deploy_pic.vehicle_id = v.id
         LEFT JOIN personnel p_log ON p_log.id = vrl.pic_personnel_id
         WHERE v.is_active = 1
         ORDER BY v.category ASC, v.code_name ASC`,
        [shiftDate, shiftNumber, teamGroup, shiftDate, shiftNumber, teamGroup]
      ),
      pool.query(
        `SELECT i.*, u.name as reporter_name
         FROM incidents i
         LEFT JOIN users u ON u.id = i.reporter_id
         WHERE i.incident_date = ? AND i.shift_number = ? AND i.team_group = ?
         ORDER BY i.incident_time ASC`,
        [shiftDate, shiftNumber, teamGroup]
      ),
      fetchVehicleIssuesAuditData(shiftDate, shiftNumber, teamGroup)
    ]);

    // Carry-over status unserviceable untuk kendaraan yang belum dilaporkan di shift ini
    const unreportedIds = allVehicles.filter((r) => r.status === 'belum_dilaporkan').map((r) => r.id);
    if (unreportedIds.length > 0) {
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
        [unreportedIds, shiftDate, shiftDate, shiftNumber]
      );

      const carryOverMap = new Map();
      for (const prev of prevLogs) {
        if (!carryOverMap.has(prev.vehicle_id)) {
          carryOverMap.set(prev.vehicle_id, prev);
        }
      }

      for (const item of allVehicles) {
        if (item.status === 'belum_dilaporkan' && carryOverMap.has(item.id)) {
          const prev = carryOverMap.get(item.id);
          item.status = 'unserviceable';
          item.justification = prev.justification;
          item.photo_webp_url = prev.photo_webp_url;
          item.follow_up_status = prev.follow_up_status;
          item.notes = prev.notes;
          item.is_carried_over = true;
          item.carried_from = {
            shift_date: prev.shift_date,
            shift_number: prev.shift_number,
            team_group: prev.team_group,
            reported_by: prev.prev_pic_name
          };
        }
      }
    }

    const vehicles = allVehicles.filter((v) => v.category !== 'posko' && v.code_name !== 'WATCHROOM');
    const watchroomUnit = allVehicles.find((v) => v.category === 'posko' || v.code_name === 'WATCHROOM');
    const watchroom = watchroomUnit
      ? {
          ...watchroomUnit,
          inspector_name: watchroomUnit.pic_name || null,
          updated_at: watchroomUnit.logged_at || null
        }
      : { status: 'belum_dilaporkan', notes: null, inspector_name: null };

    const shiftData = shifts.length > 0 ? shifts[0] : {
      shift_date: shiftDate,
      shift_number: shiftNumber,
      team_group: teamGroup,
      supervisor_name: null,
      supervisor_nip: null,
      supervisor_signature_url: null,
      status: 'open'
    };

    let supervisorName = shiftData?.supervisor_name || null;
    let supervisorNip = shiftData?.supervisor_nip || null;
    let supervisorSignatureUrl = shiftData?.pers_sig || shiftData?.user_sig || null;

    if (!supervisorName) {
      const [teamChiefs] = await pool.query(
        `SELECT p.full_name, p.nip, COALESCE(u.signature_url, p.signature_url) as signature_url
         FROM personnel p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE (u.role IN ('chief', 'supervisor') OR p.rank_position LIKE '%Chief%' OR p.rank_position LIKE '%Ketua%')
           AND p.rank_position NOT LIKE '%Assistant%'
           AND p.rank_position NOT LIKE '%Asisten%'
           AND p.rank_position NOT LIKE '%Wakil%'
           AND (u.role IS NULL OR u.role != 'chief_assistant')
           AND p.team_group = ?
         ORDER BY p.id ASC
         LIMIT 1`,
        [teamGroup]
      );
      if (teamChiefs.length > 0) {
        supervisorName = teamChiefs[0].full_name;
        supervisorNip = teamChiefs[0].nip;
        supervisorSignatureUrl = teamChiefs[0].signature_url;
      }
    }

    let deployments = [];
    let absents = [];
    let activities = [];

    if (shifts.length > 0) {
      const [[deps], [acts]] = await Promise.all([
        pool.query(
          `SELECT pd.*, p.full_name, p.nip, p.rank_position, p.cert_level, p.team_group as personnel_team,
                  v.code_name as vehicle_code, v.vehicle_name, v.category as vehicle_category
           FROM personnel_deployments pd
           JOIN personnel p ON p.id = pd.personnel_id
           LEFT JOIN vehicles v ON v.id = pd.vehicle_id
           WHERE pd.shift_id = ?
           ORDER BY pd.deployment_type ASC, pd.is_pic DESC, p.full_name ASC`,
          [shifts[0].id]
        ),
        pool.query(
          `SELECT a.*, ps.shift_date, ps.shift_number, ps.team_group
           FROM daily_shift_activities a
           JOIN personnel_shifts ps ON ps.id = a.shift_id
           WHERE a.shift_id = ?
           ORDER BY a.activity_time ASC`,
          [shifts[0].id]
        )
      ]);
      deployments = deps;
      absents = deps.filter((d) => d.deployment_type === 'absent');
      activities = acts;
    }

    const [teamAbsents] = await pool.query(
      `SELECT pd.*, p.full_name, p.nip, p.rank_position, p.team_group as personnel_team, pd.absent_reason, pd.notes
       FROM personnel_deployments pd
       JOIN personnel p ON p.id = pd.personnel_id
       JOIN personnel_shifts ps ON ps.id = pd.shift_id
       WHERE ps.shift_date = ? AND (p.team_group = ? OR ps.team_group = ?) AND pd.deployment_type = 'absent'`,
      [shiftDate, teamGroup, teamGroup]
    );

    const absentMap = new Map();
    absents.forEach((a) => absentMap.set(a.personnel_id, a));
    teamAbsents.forEach((a) => {
      if (!absentMap.has(a.personnel_id)) {
        absentMap.set(a.personnel_id, a);
      }
    });
    absents = Array.from(absentMap.values());

    // Lampirkan attachments jika ada insiden
    let incidents = incidentsRaw;
    if (incidents.length > 0) {
      const incIds = incidents.map((i) => i.id);
      const [attRows] = await pool.query(
        'SELECT * FROM incident_attachments WHERE incident_id IN (?)',
        [incIds]
      );
      const attMap = new Map();
      attRows.forEach((att) => {
        if (!attMap.has(att.incident_id)) attMap.set(att.incident_id, []);
        attMap.get(att.incident_id).push(att);
      });
      incidents = incidents.map((inc) => ({
        ...inc,
        attachments: attMap.get(inc.id) || []
      }));
    }

    const officialObj = {
      id: deptHeadData?.id || null,
      user_id: deptHeadData?.user_id || null,
      name: deptHeadData?.name || 'Section Head ARFF',
      full_name: deptHeadData?.name || 'Section Head ARFF',
      dept_head_name: deptHeadData?.name || 'Section Head ARFF',
      nip: deptHeadData?.nip || null,
      dept_head_nip: deptHeadData?.nip || null,
      rank_position: deptHeadData?.rank_position || 'Airport Rescue & Fire Fighting Section Head',
      signature_url: deptHeadData?.signature_url || null,
      dept_head_signature_url: deptHeadData?.signature_url || null
    };

    return res.status(200).json({
      success: true,
      message: 'Rekapitulasi shift berhasil diambil',
      data: {
        shift: {
          id: shiftData.id || null,
          shift_date: shiftData.shift_date,
          shift_number: shiftData.shift_number,
          team_group: shiftData.team_group,
          status: shiftData.status,
          handover_notes: shiftData.handover_notes || null,
          supervisor_name: supervisorName,
          supervisor_nip: supervisorNip,
          supervisor_signature_url: supervisorSignatureUrl
        },
        dept_head: officialObj,
        official: officialObj,
        vehicles,
        watchroom,
        vehicle_issues: vehicleIssues,
        deployments,
        absents,
        incidents,
        activities
      }
    });
  } catch (error) {
    console.error('Error getShiftSummaryReport:', error);
    return errorResponse(res, 'Gagal mengambil ringkasan laporan shift', 500);
  }
};

