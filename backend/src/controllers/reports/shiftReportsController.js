import pool from '../../config/db.js';
import {
  generateShiftReportPdf,
  getPdfCache,
  setPdfCache,
} from '../../services/pdfService.js';
import { errorResponse } from '../../utils/responseHelper.js';
import { getOfficialSignatory } from '../../utils/officialHelper.js';
import { getRosterForDate } from '../scheduleController.js';
import { fetchVehicleIssuesAuditData } from './vehicleReportsController.js';

/**
 * Mencari data Supervisor / Chief dinas secara dinamis dari database (anti-hardcode)
 * Mematuhi aturan GEMINI.md Butir 4 (Dilarang Hardcode Pejabat) & Butir 5 (Identitas Pengesah dari Database).
 */
async function resolveSupervisorForShift(poolDb, shiftDate, shiftNumber, teamGroup, shiftRow = null) {
  let supervisorName = shiftRow?.supervisor_name || null;
  let supervisorNip = shiftRow?.supervisor_nip || null;
  let supervisorSignatureUrl = shiftRow?.pers_sig || shiftRow?.user_sig || null;

  if (supervisorName) {
    return {
      name: supervisorName,
      nip: supervisorNip,
      signature_url: supervisorSignatureUrl,
      role: `Chief Regu ${teamGroup}`,
      team_group: teamGroup,
    };
  }

  // Cari Chief terdaftar di database untuk team_group ini
  const [teamChiefs] = await poolDb.query(
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
    return {
      name: teamChiefs[0].full_name,
      nip: teamChiefs[0].nip,
      signature_url: teamChiefs[0].signature_url,
      role: `Chief Regu ${teamGroup}`,
      team_group: teamGroup,
    };
  }

  // Fallback dinamis: Cari personil paling senior di regu tersebut dari database
  const [seniorMembers] = await poolDb.query(
    `SELECT p.full_name, p.nip, COALESCE(u.signature_url, p.signature_url) as signature_url
     FROM personnel p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.team_group = ? AND p.is_active = 1
     ORDER BY FIELD(p.cert_level, 'Senior', 'Junior', 'Basic'), p.id ASC
     LIMIT 1`,
    [teamGroup]
  );

  if (seniorMembers.length > 0) {
    return {
      name: seniorMembers[0].full_name,
      nip: seniorMembers[0].nip,
      signature_url: seniorMembers[0].signature_url,
      role: `Chief Regu ${teamGroup}`,
      team_group: teamGroup,
    };
  }

  return {
    name: `Ketua Regu ${teamGroup}`,
    nip: null,
    signature_url: null,
    role: `Chief Regu ${teamGroup}`,
    team_group: teamGroup,
  };
}

/**
 * Mengambil dan menyusun data rekapitulasi harian operasional 24 jam (3 Shift)
 * Mencakup susunan roster, kekuatan personel, kesiapan armada, watchroom, kegiatan rutin, insiden, dan pejabat pengesah.
 */
export const fetchDailyReportData = async (targetDateStr, selectedShiftNumber = 1, selectedTeamGroup = null) => {
  const shiftDate = targetDateStr || new Date().toISOString().split('T')[0];
  const roster = await getRosterForDate(shiftDate);

  const shiftDefs = [
    { number: 1, name: 'Pagi', hours: '07:00 - 13:00 WIB', team: roster.shift_1 },
    { number: 2, name: 'Siang', hours: '13:00 - 20:00 WIB', team: roster.shift_2 },
    { number: 3, name: 'Malam', hours: '20:00 - 07:00 WIB', team: roster.shift_3 },
  ];

  // 1. Pejabat Section Head / Dept Head
  const deptHeadData = await getOfficialSignatory(pool);

  // 2. Query data shift dinas dari database
  const [shiftsFromDb] = await pool.query(
    `SELECT ps.*, u.name as supervisor_name, u.signature_url as user_sig, p.signature_url as pers_sig, p.nip as supervisor_nip
     FROM personnel_shifts ps
     LEFT JOIN users u ON u.id = ps.supervisor_id
     LEFT JOIN personnel p ON p.user_id = u.id
     WHERE ps.shift_date = ?`,
    [shiftDate]
  );

  // 3. Susun data 3 shift dan supervisor masing-masing
  const shifts = await Promise.all(
    shiftDefs.map(async (sd) => {
      const match = shiftsFromDb.find(
        (ps) => ps.shift_number === sd.number && (ps.team_group === sd.team || shiftsFromDb.length <= 3)
      ) || shiftsFromDb.find((ps) => ps.shift_number === sd.number) || null;

      const supervisor = await resolveSupervisorForShift(pool, shiftDate, sd.number, sd.team, match);
      return {
        id: match?.id || null,
        shift_number: sd.number,
        shift_name: sd.name,
        shift_hours: sd.hours,
        team_group: sd.team,
        status: match?.status || 'open',
        handover_notes: match?.handover_notes || null,
        supervisor_name: supervisor.name,
        supervisor_nip: supervisor.nip,
        supervisor_signature_url: supervisor.signature_url,
        supervisor,
      };
    })
  );

  const isDailyReportClosed = shifts.length === 3 && shifts.every((s) => s.status === 'closed');
  const dailyStatus = isDailyReportClosed ? 'closed' : 'open';

  // 4. Query data penugasan personel untuk tanggal ini
  const [allDeployments] = await pool.query(
    `SELECT pd.*, p.full_name, p.nip, p.rank_position, p.cert_level, p.team_group as personnel_team,
            v.code_name as vehicle_code, v.vehicle_name, v.category as vehicle_category,
            ps.shift_number, ps.team_group as shift_team
     FROM personnel_deployments pd
     JOIN personnel_shifts ps ON ps.id = pd.shift_id
     JOIN personnel p ON p.id = pd.personnel_id
     LEFT JOIN vehicles v ON v.id = pd.vehicle_id
     WHERE ps.shift_date = ?
     ORDER BY ps.shift_number ASC, pd.deployment_type ASC, pd.is_pic DESC, p.full_name ASC`,
    [shiftDate]
  );

  // 5. Query data ketidakhadiran / cuti / izin
  const [allAbsents] = await pool.query(
    `SELECT pd.*, p.full_name, p.nip, p.rank_position, p.team_group as personnel_team, pd.absent_reason, pd.notes,
            ps.shift_number, ps.team_group as shift_team
     FROM personnel_deployments pd
     JOIN personnel p ON p.id = pd.personnel_id
     JOIN personnel_shifts ps ON ps.id = pd.shift_id
     WHERE ps.shift_date = ? AND pd.deployment_type = 'absent'
     ORDER BY ps.shift_number ASC, p.full_name ASC`,
    [shiftDate]
  );

  // Petakan penugasan dan absensi ke masing-masing shift
  shifts.forEach((s) => {
    s.deployments = allDeployments.filter((d) => d.shift_number === s.shift_number);
    s.present_count = s.deployments.filter((d) => d.deployment_type !== 'absent').length;

    const shiftAbsents = allAbsents.filter(
      (a) => a.shift_number === s.shift_number || a.personnel_team === s.team_group || a.shift_team === s.team_group
    );
    const uniqueAbsentMap = new Map();
    shiftAbsents.forEach((a) => uniqueAbsentMap.set(a.personnel_id, a));
    s.absents = Array.from(uniqueAbsentMap.values());
    s.absent_count = s.absents.length;
  });

  // 6. Query data seluruh kendaraan operasional & posko
  const [activeVehicles] = await pool.query(
    `SELECT v.id, v.code_name, v.vehicle_name, v.category, v.license_plate, v.description
     FROM vehicles v
     WHERE v.is_active = 1
     ORDER BY CASE v.category WHEN 'utama' THEN 1 WHEN 'pendukung' THEN 2 WHEN 'posko' THEN 3 ELSE 4 END, v.id ASC`
  );

  const [allLogsForDate] = await pool.query(
    `SELECT vrl.*, p.full_name as pic_name, p.nip as pic_nip
     FROM vehicle_readiness_logs vrl
     LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
     WHERE vrl.shift_date = ?`,
    [shiftDate]
  );

  const [deployedPics] = await pool.query(
    `SELECT pd.vehicle_id, ps.shift_number, ps.team_group, p.id as pic_id, p.full_name as pic_name, p.nip as pic_nip
     FROM personnel_deployments pd
     JOIN personnel_shifts ps ON ps.id = pd.shift_id
     JOIN personnel p ON p.id = pd.personnel_id
     WHERE ps.shift_date = ? AND pd.is_pic = 1`,
    [shiftDate]
  );

  // Carry-over kerusakan estafet unserviceable dari shift/hari sebelumnya
  const [unresolvedLogs] = await pool.query(
    `SELECT vrl.vehicle_id, vrl.status, vrl.justification, vrl.follow_up_status, vrl.notes,
            vrl.shift_date, vrl.shift_number, vrl.team_group, p.full_name as prev_pic_name
     FROM vehicle_readiness_logs vrl
     JOIN (
       SELECT vehicle_id, MAX(CONCAT(shift_date, '_', LPAD(shift_number, 2, '0'))) as max_shift
       FROM vehicle_readiness_logs
       WHERE status = 'unserviceable'
         AND follow_up_status != 'resolved'
         AND shift_date <= ?
       GROUP BY vehicle_id
     ) latest ON latest.vehicle_id = vrl.vehicle_id
             AND CONCAT(vrl.shift_date, '_', LPAD(vrl.shift_number, 2, '0')) = latest.max_shift
     LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
     WHERE vrl.status = 'unserviceable'
       AND vrl.follow_up_status != 'resolved'`,
    [shiftDate]
  );

  const carryOverMap = new Map();
  for (const prev of unresolvedLogs) {
    if (!carryOverMap.has(prev.vehicle_id)) {
      carryOverMap.set(prev.vehicle_id, prev);
    }
  }

  // Bentuk matriks kesiapan armada 24 jam untuk Shift 1, Shift 2, dan Shift 3
  const vehicleMatrix = activeVehicles.map((v) => {
    const shiftStatuses = {};

    [1, 2, 3].forEach((sNum) => {
      const log = allLogsForDate.find((l) => l.vehicle_id === v.id && l.shift_number === sNum);
      const deployPic = deployedPics.find((dp) => dp.vehicle_id === v.id && dp.shift_number === sNum);

      if (log) {
        shiftStatuses[`shift_${sNum}`] = {
          status: log.status || 'belum_dilaporkan',
          justification: log.justification || '',
          notes: log.notes || '',
          pic_name: deployPic?.pic_name || log.pic_name || '-',
          pic_nip: deployPic?.pic_nip || log.pic_nip || null,
          is_carried_over: false,
          logged_at: log.updated_at || null,
        };
      } else {
        const carry = carryOverMap.get(v.id);
        if (carry && (carry.shift_date < shiftDate || (carry.shift_date === shiftDate && carry.shift_number < sNum))) {
          shiftStatuses[`shift_${sNum}`] = {
            status: 'unserviceable',
            justification: carry.justification || 'Kendala estafet belum terselesaikan',
            notes: carry.notes || '',
            pic_name: deployPic?.pic_name || carry.prev_pic_name || '-',
            pic_nip: null,
            is_carried_over: true,
            carried_from: {
              shift_date: carry.shift_date,
              shift_number: carry.shift_number,
              team_group: carry.team_group,
            },
          };
        } else {
          shiftStatuses[`shift_${sNum}`] = {
            status: 'belum_dilaporkan',
            justification: '-',
            notes: '',
            pic_name: deployPic?.pic_name || '-',
            pic_nip: null,
            is_carried_over: false,
          };
        }
      }
    });

    const dailyNotes =
      shiftStatuses.shift_1.justification && shiftStatuses.shift_1.justification !== '-'
        ? shiftStatuses.shift_1.justification
        : shiftStatuses.shift_2.justification && shiftStatuses.shift_2.justification !== '-'
        ? shiftStatuses.shift_2.justification
        : shiftStatuses.shift_3.justification && shiftStatuses.shift_3.justification !== '-'
        ? shiftStatuses.shift_3.justification
        : '-';

    const targetShiftStatus = shiftStatuses[`shift_${selectedShiftNumber}`] || shiftStatuses.shift_1;

    return {
      id: v.id,
      code_name: v.code_name,
      vehicle_name: v.vehicle_name,
      category: v.category,
      license_plate: v.license_plate,
      description: v.description,
      shift_1: shiftStatuses.shift_1,
      shift_2: shiftStatuses.shift_2,
      shift_3: shiftStatuses.shift_3,
      daily_notes: dailyNotes,
      // Properti untuk kompatibilitas tampilan shift tunggal (desktop / mobile UI):
      status: targetShiftStatus.status,
      justification: targetShiftStatus.justification,
      notes: targetShiftStatus.notes,
      pic_name: targetShiftStatus.pic_name,
      pic_nip: targetShiftStatus.pic_nip,
      is_carried_over: targetShiftStatus.is_carried_over,
    };
  });

  const watchroomUnit = vehicleMatrix.find((v) => v.category === 'posko' || v.code_name === 'WATCHROOM');
  const watchroom = watchroomUnit
    ? {
        ...watchroomUnit,
        inspector_name: watchroomUnit.pic_name || null,
        updated_at: watchroomUnit.shift_1?.logged_at || null,
      }
    : { status: 'belum_dilaporkan', notes: null, inspector_name: null };

  // 7. Query jurnal kegiatan operasional 24 jam
  const [allActivities] = await pool.query(
    `SELECT a.*, ps.shift_date, ps.shift_number, ps.team_group
     FROM daily_shift_activities a
     JOIN personnel_shifts ps ON ps.id = a.shift_id
     WHERE ps.shift_date = ?
     ORDER BY a.activity_time ASC`,
    [shiftDate]
  );

  shifts.forEach((s) => {
    s.activities = allActivities.filter((act) => act.shift_number === s.shift_number);
  });

  // 8. Query insiden darurat 24 jam
  const [incidentsRaw] = await pool.query(
    `SELECT i.*, u.name as reporter_name
     FROM incidents i
     LEFT JOIN users u ON u.id = i.reporter_id
     WHERE i.incident_date = ?
     ORDER BY i.incident_time ASC`,
    [shiftDate]
  );

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
      attachments: attMap.get(inc.id) || [],
    }));
  }

  shifts.forEach((s) => {
    s.incidents = incidents.filter((inc) => inc.shift_number === s.shift_number);
  });

  // 9. Pelacakan kendala armada
  const vehicleIssues = await fetchVehicleIssuesAuditData(
    shiftDate,
    selectedShiftNumber,
    selectedTeamGroup || roster[`shift_${selectedShiftNumber}`]
  );

  const officialObj = {
    id: deptHeadData?.id || null,
    user_id: deptHeadData?.user_id || null,
    name: deptHeadData?.name || 'Section Head ARFF',
    full_name: deptHeadData?.name || 'Section Head ARFF',
    dept_head_name: deptHeadData?.name || 'Section Head ARFF',
    nip: deptHeadData?.nip || null,
    dept_head_nip: deptHeadData?.nip || null,
    rank_position: deptHeadData?.rank_position || 'Airport Rescue & Fire Fighting Section Head',
    signature_url: isDailyReportClosed ? (deptHeadData?.signature_url || null) : null,
    dept_head_signature_url: isDailyReportClosed ? (deptHeadData?.signature_url || null) : null,
  };

  const selectedShiftObj = shifts.find((s) => s.shift_number === selectedShiftNumber) || shifts[0];

  return {
    shift_date: shiftDate,
    date: shiftDate,
    roster,
    daily_roster: roster,
    status: dailyStatus,
    is_closed: isDailyReportClosed,
    dept_head: officialObj,
    official: officialObj,
    dept_head_name: officialObj.name,
    dept_head_nip: officialObj.nip,
    dept_head_signature_url: officialObj.signature_url,
    shifts,
    chiefs: {
      shift_1: shifts[0]?.supervisor,
      shift_2: shifts[1]?.supervisor,
      shift_3: shifts[2]?.supervisor,
    },
    vehicles: vehicleMatrix,
    vehicle_matrix: vehicleMatrix,
    watchroom,
    vehicle_issues: vehicleIssues,
    all_deployments: allDeployments,
    deployments: selectedShiftObj.deployments || allDeployments,
    absents: allAbsents,
    all_activities: allActivities,
    activities: allActivities,
    incidents,
    shift: selectedShiftObj,
  };
};

/**
 * Controller Penerbitan Berkas PDF Laporan Resmi Pelaksanaan Dinas Harian Operasional (24 Jam)
 */
export const getShiftReportPdf = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = Math.min(Math.max(parseInt(shift, 10) || 1, 1), 3);

    // Ambil data komprehensif harian 24 jam
    const reportData = await fetchDailyReportData(shiftDate, shiftNumber, team_group);

    // 1. Cek In-Memory Cache PDF (termasuk status harian untuk mencegah drift draf vs final)
    const cacheKey = `daily_report_${shiftDate}_${reportData.status}`;
    const cachedBuffer = getPdfCache(cacheKey);
    if (cachedBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="laporan-harian-arff-${shiftDate}.pdf"`
      );
      return res.send(cachedBuffer);
    }

    const doc = await generateShiftReportPdf(reportData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="laporan-harian-arff-${shiftDate}.pdf"`
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
 * Endpoint agregasi terpadu ringkasan operasional harian 24 jam (1 roundtrip HTTP)
 */
export const getShiftSummaryReport = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = Math.min(Math.max(parseInt(shift, 10) || 1, 1), 3);

    const data = await fetchDailyReportData(shiftDate, shiftNumber, team_group);

    return res.status(200).json({
      success: true,
      message: 'Rekapitulasi harian operasional 24 jam berhasil diambil',
      data,
    });
  } catch (error) {
    console.error('Error getShiftSummaryReport:', error);
    return errorResponse(res, 'Gagal mengambil ringkasan laporan operasional: ' + error.message, 500);
  }
};

export const getDailySummaryReport = getShiftSummaryReport;
