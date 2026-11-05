import pool from '../../config/db.js';
import {
  generateShiftReportPdf,
  getPdfCache,
  setPdfCache,
} from '../../services/pdfService.js';
import { streamPdfToResponse } from '../../services/pdfBaseHelper.js';
import { errorResponse } from '../../utils/responseHelper.js';
import { getOfficialSignatory } from '../../utils/officialHelper.js';
import { resolveRosterForDate, getStoredCycles } from '../scheduleController.js';

/**
 * Mencari identitas Ketua Regu / Pejabat Penanggung Jawab Shift secara dinamis dari database
 */
async function getChiefForTeam(teamGroup, shiftDate, shiftNumber) {
  try {
    // 1. Cek dari personnel_shifts jika sudah ada entitas shift
    const [shifts] = await pool.query(
      `SELECT ps.*, COALESCE(p.full_name, u.name) as supervisor_name, u.signature_url as user_sig, p.signature_url as pers_sig, p.nip as supervisor_nip
       FROM personnel_shifts ps
       LEFT JOIN users u ON u.id = ps.supervisor_id
       LEFT JOIN personnel p ON p.user_id = u.id
       WHERE ps.shift_date = ? AND ps.shift_number = ? AND ps.team_group = ?`,
      [shiftDate, shiftNumber, teamGroup]
    );
    if (shifts.length > 0 && shifts[0].supervisor_name) {
      return {
        name: shifts[0].supervisor_name,
        nip: shifts[0].supervisor_nip || null,
        signature_url: shifts[0].pers_sig || shifts[0].user_sig || null,
        team: teamGroup,
        shift_number: shiftNumber,
        status: shifts[0].status || 'open',
      };
    }

    // 2. Cari dari tabel personnel yang memegang jabatan Chief / Supervisor untuk regu tersebut
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
      return {
        name: teamChiefs[0].full_name,
        nip: teamChiefs[0].nip || null,
        signature_url: teamChiefs[0].signature_url || null,
        team: teamGroup,
        shift_number: shiftNumber,
        status: 'open',
      };
    }

    // 3. Fallback: Cari personel aktif paling senior di regu tersebut
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
      return {
        name: seniorMembers[0].full_name,
        nip: seniorMembers[0].nip || null,
        signature_url: seniorMembers[0].signature_url || null,
        team: teamGroup,
        shift_number: shiftNumber,
        status: 'open',
      };
    }

    return {
      name: `Ketua Regu ${teamGroup}`,
      nip: null,
      signature_url: null,
      team: teamGroup,
      shift_number: shiftNumber,
      status: 'open',
    };
  } catch (err) {
    console.warn(`Gagal mencari Chief untuk regu ${teamGroup}:`, err.message);
    return {
      name: `Ketua Regu ${teamGroup}`,
      nip: null,
      signature_url: null,
      team: teamGroup,
      shift_number: shiftNumber,
      status: 'open',
    };
  }
}

/**
 * Mengambil data operasional harian 24 Jam (Shift 1, 2, dan 3) secara terpadu
 * Format Matriks Kesiapan Armada Harian (Daily Readiness Matrix)
 */
export async function getDailyOperationalData(shiftDate) {
  // 1. Roster 3 Regu untuk tanggal tersebut
  const storedCycles = await getStoredCycles();
  let roster = null;
  const [overrideRows] = await pool.query(
    `SELECT shift_1_team, shift_2_team, shift_3_team, off_team FROM schedule_rosters WHERE roster_date = ?`,
    [shiftDate]
  );
  if (overrideRows.length > 0 && overrideRows[0].shift_1_team) {
    roster = {
      shift_1: overrideRows[0].shift_1_team,
      shift_2: overrideRows[0].shift_2_team,
      shift_3: overrideRows[0].shift_3_team,
      off_team: overrideRows[0].off_team,
    };
  } else {
    roster = resolveRosterForDate(shiftDate, storedCycles);
  }

  // 2. Pejabat Section Head & 3 Ketua Regu
  const [deptHeadData, chiefs] = await Promise.all([
    getOfficialSignatory(pool),
    Promise.all([
      getChiefForTeam(roster.shift_1, shiftDate, 1),
      getChiefForTeam(roster.shift_2, shiftDate, 2),
      getChiefForTeam(roster.shift_3, shiftDate, 3),
    ]),
  ]);

  // 3. Seluruh Armada Aktif (termasuk Posko)
  const [allVehicles] = await pool.query(
    `SELECT v.id, v.code_name, v.vehicle_name, v.category, v.license_plate, v.description
     FROM vehicles v
     WHERE v.is_active = 1
     ORDER BY CASE v.category WHEN 'utama' THEN 1 WHEN 'pendukung' THEN 2 WHEN 'posko' THEN 3 ELSE 4 END, v.id ASC`
  );

  // 4. Log Pemeriksaan Kesiapan Armada pada shiftDate
  const [readinessLogs] = await pool.query(
    `SELECT vrl.*, p.full_name as pic_name, p.nip as pic_nip
     FROM vehicle_readiness_logs vrl
     LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
     WHERE vrl.shift_date = ?`,
    [shiftDate]
  );

  // 5. Ploting PIC dari penugasan harian
  const [picDeployments] = await pool.query(
    `SELECT pd.vehicle_id, ps.shift_number, ps.team_group, p.id as personnel_id, p.full_name, p.nip
     FROM personnel_deployments pd
     JOIN personnel_shifts ps ON ps.id = pd.shift_id
     JOIN personnel p ON p.id = pd.personnel_id
     WHERE ps.shift_date = ? AND pd.is_pic = 1`,
    [shiftDate]
  );

  // 6. Carry-Over unserviceable status dari hari/shift sebelumnya yang belum pulih
  const [prevUnserv] = await pool.query(
    `SELECT vrl.vehicle_id, vrl.status, vrl.justification, vrl.notes, vrl.shift_date, vrl.shift_number, vrl.team_group, p.full_name as prev_pic_name
     FROM vehicle_readiness_logs vrl
     JOIN (
       SELECT vehicle_id, MAX(CONCAT(shift_date, '_', LPAD(shift_number, 2, '0'))) as max_shift
       FROM vehicle_readiness_logs
       WHERE shift_date < ?
         AND status = 'unserviceable'
         AND follow_up_status != 'resolved'
       GROUP BY vehicle_id
     ) latest ON latest.vehicle_id = vrl.vehicle_id AND CONCAT(vrl.shift_date, '_', LPAD(vrl.shift_number, 2, '0')) = latest.max_shift
     LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
     WHERE vrl.status = 'unserviceable' AND vrl.follow_up_status != 'resolved'`,
    [shiftDate]
  );
  const carryOverMap = new Map();
  prevUnserv.forEach((u) => carryOverMap.set(u.vehicle_id, u));

  // 7. Bentuk Matriks Kesiapan Armada Harian
  const matrixVehicles = allVehicles.map((v) => {
    const shiftStatuses = {};
    const vehicleNotes = [];

    [1, 2, 3].forEach((sNum) => {
      const team = sNum === 1 ? roster.shift_1 : sNum === 2 ? roster.shift_2 : roster.shift_3;
      const log = readinessLogs.find(
        (l) => l.vehicle_id === v.id && Number(l.shift_number) === sNum
      );
      const pic = picDeployments.find(
        (d) => d.vehicle_id === v.id && Number(d.shift_number) === sNum
      );

      let status = 'belum_dilaporkan';
      let justification = null;
      let notes = null;
      const picName = pic?.full_name || log?.pic_name || null;

      if (log && log.status && log.status !== 'belum_dilaporkan') {
        status = log.status;
        justification = log.justification;
        notes = log.notes;
      } else if (carryOverMap.has(v.id)) {
        const prev = carryOverMap.get(v.id);
        status = 'unserviceable';
        justification = prev.justification;
        notes = prev.notes;
      }

      shiftStatuses[`shift_${sNum}`] = {
        shift_number: sNum,
        team_group: team,
        status,
        justification,
        notes,
        pic_name: picName,
      };

      if (justification || notes) {
        const text = justification || notes;
        vehicleNotes.push(`${team}: ${text}`);
      }
    });

    return {
      id: v.id,
      code_name: v.code_name,
      vehicle_name: v.vehicle_name,
      category: v.category,
      license_plate: v.license_plate,
      description: v.description,
      ...shiftStatuses,
      notes: vehicleNotes.length > 0 ? vehicleNotes.join('; ') : '-',
    };
  });

  // 8. Kekuatan & Distribusi Personel 3 Regu (Presensi & Cuti)
  const [allDeployments] = await pool.query(
    `SELECT pd.*, p.full_name, p.nip, p.rank_position, p.cert_level, p.team_group as personnel_team,
            ps.shift_number, ps.team_group as shift_team
     FROM personnel_deployments pd
     JOIN personnel p ON p.id = pd.personnel_id
     JOIN personnel_shifts ps ON ps.id = pd.shift_id
     WHERE ps.shift_date = ?
     ORDER BY ps.shift_number ASC, pd.deployment_type ASC, p.full_name ASC`,
    [shiftDate]
  );

  const personnelSummary = {};
  [1, 2, 3].forEach((sNum) => {
    const team = sNum === 1 ? roster.shift_1 : sNum === 2 ? roster.shift_2 : roster.shift_3;
    const shiftDeps = allDeployments.filter((d) => Number(d.shift_number) === sNum);
    const present = shiftDeps.filter((d) => d.deployment_type !== 'absent');
    const absents = shiftDeps.filter((d) => d.deployment_type === 'absent');

    personnelSummary[`shift_${sNum}`] = {
      shift_number: sNum,
      team,
      present_count: present.length,
      absent_count: absents.length,
      present,
      absents,
    };
  });

  // 9. Jurnal Kegiatan Rutin 24 Jam (Kronologis)
  const [activities] = await pool.query(
    `SELECT a.*, ps.shift_number, ps.team_group
     FROM daily_shift_activities a
     JOIN personnel_shifts ps ON ps.id = a.shift_id
     WHERE ps.shift_date = ?
     ORDER BY a.activity_time ASC, ps.shift_number ASC`,
    [shiftDate]
  );

  // 10. Rekapitulasi Kejadian & Insiden 24 Jam (Kronologis)
  const [incidentsRaw] = await pool.query(
    `SELECT i.*, u.name as reporter_name
     FROM incidents i
     LEFT JOIN users u ON u.id = i.reporter_id
     WHERE i.incident_date = ?
     ORDER BY i.incident_time ASC, i.shift_number ASC`,
    [shiftDate]
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
    signature_url: deptHeadData?.signature_url || null,
    dept_head_signature_url: deptHeadData?.signature_url || null,
  };

  return {
    shift_date: shiftDate,
    roster,
    matrixVehicles,
    vehicles: matrixVehicles, // Backwards-compatible
    personnelSummary,
    deployments: allDeployments, // Backwards-compatible
    absents: allDeployments.filter((d) => d.deployment_type === 'absent'), // Backwards-compatible
    activities,
    incidents: incidentsRaw,
    chiefs: {
      shift_1: chiefs[0],
      shift_2: chiefs[1],
      shift_3: chiefs[2],
    },
    chiefsList: chiefs,
    dept_head: officialObj,
    official: officialObj,
    deptHeadData: officialObj,
  };
}

/**
 * Controller: Unduh / Streaming PDF Laporan Harian ARFF YIA (24 Jam • 3 Shift)
 */
export const getShiftReportPdf = async (req, res) => {
  try {
    const { date } = req.query;
    const shiftDate = date || new Date().toISOString().split('T')[0];

    // Cek In-Memory Cache PDF Laporan Harian
    const cacheKey = `daily_report_${shiftDate}`;
    const cachedBuffer = getPdfCache(cacheKey);
    if (cachedBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="laporan-harian-arff-${shiftDate}.pdf"`
      );
      return res.send(cachedBuffer);
    }

    const dailyData = await getDailyOperationalData(shiftDate);
    const doc = await generateShiftReportPdf(dailyData);

    streamPdfToResponse(doc, res, req, {
      filename: `laporan-harian-arff-${shiftDate}.pdf`,
      onEnd: (resultBuffer) => setPdfCache(cacheKey, resultBuffer),
    });
  } catch (error) {
    console.error('Error getShiftReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF harian: ' + error.message, 500);
  }
};

/**
 * Controller: Ambil Ringkasan Laporan Harian Terpadu (1 roundtrip HTTP)
 */
export const getShiftSummaryReport = async (req, res) => {
  try {
    const { date } = req.query;
    const shiftDate = date || new Date().toISOString().split('T')[0];

    const dailyData = await getDailyOperationalData(shiftDate);

    return res.status(200).json({
      success: true,
      message: 'Rekapitulasi laporan harian operasional berhasil diambil',
      data: dailyData,
    });
  } catch (error) {
    console.error('Error getShiftSummaryReport:', error);
    return errorResponse(res, 'Gagal mengambil ringkasan laporan harian: ' + error.message, 500);
  }
};
