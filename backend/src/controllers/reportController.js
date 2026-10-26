import pool from '../config/db.js';
import {
  generateShiftReportPdf,
  generateVehicleReadinessReportPdf,
  generateIncidentSummaryReportPdf,
  generateActivitiesReportPdf,
  getPdfCache,
  setPdfCache,
} from '../services/pdfService.js';
import { errorResponse } from '../utils/responseHelper.js';
import { calculateVehicleTransitionsData } from './readinessController.js';
import { getOfficialSignatory } from '../utils/officialHelper.js';
import { cleanTeam } from '../utils/roleMapper.js';

export { getOfficialSignatory };


export const getShiftReportPdf = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;

    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;
    const rawTeam = team_group || 'Alpha';
    const teamGroup = rawTeam.replace(/^(Regu\s+|Team\s+)/i, '').trim();

    // 1. Cek In-Memory Cache PDF
    const cacheKey = `shift_report_${shiftDate}_${shiftNumber}_${teamGroup}`;
    const cachedBuffer = getPdfCache(cacheKey);
    if (cachedBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="laporan-shift-${shiftNumber}-${teamGroup}-${shiftDate}.pdf"`
      );
      return res.send(cachedBuffer);
    }

    // Eksekusi generator PDF resmi laporan dinas A4
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

    const reportPayload = {
      shift_date: shiftData.shift_date,
      shift_number: shiftData.shift_number,
      team_group: shiftData.team_group,
      supervisor_name: supervisorName,
      supervisor_nip: supervisorNip,
      supervisor_signature_url: supervisorSignatureUrl,
      dept_head_name: deptHeadData?.name || 'Section Head ARFF',
      dept_head_nip: deptHeadData?.nip || null,
      dept_head_signature_url: deptHeadData?.signature_url || null,
      status: shiftData.status,
      vehicles,
      watchroom: watchrooms.length > 0 ? watchrooms[0] : {},
      deployments,
      absents,
      incidents,
      activities
    };

    const doc = generateShiftReportPdf(reportPayload);

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

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error getShiftReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF: ' + error.message, 500);
  }
};

/**
 * Audit trail kendala armada operasional
 * STRICT INSTRUKSI 2 PENGGUNA:
 * Hanya tampilkan kendaraan yang statusnya MASIH unserviceable, ATAU
 * Kendaraan yang mengalami transisi status (serviceable <-> unserviceable) pada shift ini.
 */
export const getVehicleIssuesAudit = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;
    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;
    const currentTeam = team_group || 'Alpha';

    // 1. Kendala unserviceable pada shift saat ini (status masih unserviceable)
    const [currentIssues] = await pool.query(
      `SELECT vrl.id, vrl.vehicle_id, v.code_name, v.vehicle_name, v.category,
              vrl.shift_date, vrl.shift_number, vrl.team_group, vrl.status,
              vrl.justification, vrl.follow_up_status, vrl.resolved_at, vrl.notes,
              p.full_name as reported_by_name, p.nip as reported_by_nip
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
         AND vrl.status = 'unserviceable'`,
      [shiftDate, shiftNumber, currentTeam]
    );

    // 2. Kendaraan yang berhasil dipulihkan (transisi unserviceable -> serviceable) pada shift ini
    const [resolvedThisShift] = await pool.query(
      `SELECT vrl.id, vrl.vehicle_id, v.code_name, v.vehicle_name, v.category,
              vrl.shift_date, vrl.shift_number, vrl.team_group, vrl.status,
              vrl.justification, vrl.follow_up_status,
              COALESCE(vrl.resolved_at, vrl.updated_at, vrl.created_at) as resolved_at,
              vrl.notes,
              p.full_name as resolved_by_name, p.nip as resolved_by_nip
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE vrl.shift_date = ? AND vrl.shift_number = ? AND vrl.team_group = ?
         AND vrl.status = 'serviceable'
         AND (
           vrl.resolved_at IS NOT NULL
           OR vrl.follow_up_status = 'resolved'
           OR EXISTS (
             SELECT 1 FROM vehicle_readiness_logs prev
             WHERE prev.vehicle_id = vrl.vehicle_id
               AND prev.status = 'unserviceable'
               AND (prev.shift_date < ? OR (prev.shift_date = ? AND prev.shift_number < ?))
               AND (prev.follow_up_status != 'resolved' OR prev.resolved_at IS NULL)
           )
         )`,
      [shiftDate, shiftNumber, currentTeam, shiftDate, shiftDate, shiftNumber]
    );

    // 3. Backlog kendala yang statusnya MASIH unserviceable dari shift-shift sebelumnya
    // Kendaraan yang sudah tercatat di currentIssues atau resolvedThisShift dikecualikan agar tidak dobel.
    const handledVehicleIds = new Set([
      ...currentIssues.map((i) => i.vehicle_id),
      ...resolvedThisShift.map((i) => i.vehicle_id)
    ]);

    const [rawBacklog] = await pool.query(
      `SELECT vrl.id, vrl.vehicle_id, v.code_name, v.vehicle_name, v.category,
              vrl.shift_date, vrl.shift_number, vrl.team_group, vrl.status,
              vrl.justification, vrl.follow_up_status, vrl.resolved_at, vrl.notes,
              p.full_name as reported_by_name, p.nip as reported_by_nip
       FROM vehicle_readiness_logs vrl
       JOIN vehicles v ON v.id = vrl.vehicle_id
       LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
       WHERE vrl.status = 'unserviceable'
         AND vrl.follow_up_status != 'resolved'
         AND (vrl.shift_date < ? OR (vrl.shift_date = ? AND vrl.shift_number < ?))
       ORDER BY vrl.shift_date DESC, vrl.shift_number DESC, vrl.id DESC`,
      [shiftDate, shiftDate, shiftNumber]
    );

    // Periksa status log serviceable paling mutakhir per kendaraan sebelum shift saat ini
    const [serviceableLogs] = await pool.query(
      `SELECT vehicle_id, MAX(CONCAT(shift_date, ' ', LPAD(shift_number, 2, '0'))) as latest_serv
       FROM vehicle_readiness_logs
       WHERE status = 'serviceable'
         AND (shift_date < ? OR (shift_date = ? AND shift_number <= ?))
       GROUP BY vehicle_id`,
      [shiftDate, shiftDate, shiftNumber]
    );
    const serviceableMap = new Map();
    serviceableLogs.forEach((r) => serviceableMap.set(r.vehicle_id, r.latest_serv));

    // Deduplikasi backlog: ambil tepat 1 record unserviceable terbaru per unit armada yang masih belum sembuh
    const backlogIssues = [];
    const seenVehicle = new Set();

    for (const item of rawBacklog) {
      if (handledVehicleIds.has(item.vehicle_id) || seenVehicle.has(item.vehicle_id)) {
        continue;
      }
      const itemKey = `${item.shift_date} ${String(item.shift_number).padStart(2, '0')}`;
      const latestServ = serviceableMap.get(item.vehicle_id);
      // Jika ada log serviceable yang lebih mutakhir daripada log unserviceable ini, maka unit sudah tidak unserviceable
      if (latestServ && latestServ > itemKey) {
        continue;
      }
      seenVehicle.add(item.vehicle_id);
      backlogIssues.push(item);
    }

    return res.json({
      success: true,
      message: 'Data pelacakan kendala armada berhasil diambil',
      data: {
        shift_date: shiftDate,
        shift_number: shiftNumber,
        team_group: currentTeam,
        current_issues: currentIssues,
        backlog_issues: backlogIssues,
        resolved_this_shift: resolvedThisShift
      }
    });
  } catch (error) {
    console.error('Error getVehicleIssuesAudit:', error);
    return errorResponse(res, 'Gagal mengambil data pelacakan kendala armada: ' + error.message, 500);
  }
};

/**
 * Controller Laporan Kesiapan Armada dalam Format PDF (Mendukung /armada/laporan)
 * Menggunakan Single Source of Truth dari calculateVehicleTransitionsData (100% sinkron dengan layar web)
 */
export const getVehiclesReportPdf = async (req, res) => {
  try {
    const { period = '1month', start_date, end_date } = req.query;

    // Ambil data transisi kesiapan armada (Single Source of Truth dari calculateVehicleTransitionsData)
    const reportData = await calculateVehicleTransitionsData({ period, start_date, end_date });

    // Ambil data pejabat Section Head / Dept Head secara dinamis dari database
    const deptHeadData = await getOfficialSignatory(pool);

    // Kumpulkan seluruh riwayat siklus kendala (issue_periods) dari seluruh armada
    const allIssuePeriods = [];
    (reportData.vehicles || []).forEach((v) => {
      (v.issue_periods || []).forEach((p) => {
        allIssuePeriods.push({
          vehicle_id: v.id,
          code_name: v.code_name,
          vehicle_name: v.vehicle_name,
          category: v.category,
          start_date: p.start_date,
          start_shift_number: p.start_shift_number,
          start_team_group: p.start_team_group,
          justification: p.justification,
          notes: p.notes,
          reported_by: p.reported_by,
          unserviceable_shifts_count: p.unserviceable_shifts_count,
          is_resolved: p.is_resolved,
          resolved_date: p.resolved_date,
          resolved_shift_number: p.resolved_shift_number,
          resolved_team_group: p.resolved_team_group,
          resolved_by: p.resolved_by,
          status: p.status,
        });
      });
    });

    // Urutkan riwayat kendala dari tanggal terbaru
    allIssuePeriods.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    let periodLabel = '1 Bulan Terakhir';
    if (period === '3months') periodLabel = '3 Bulan Terakhir';
    else if (period === '1year') periodLabel = '1 Tahun Terakhir';
    else if (period === 'custom' || (start_date && end_date)) periodLabel = 'Rentang Kustom';

    const payload = {
      periodLabel,
      period: reportData.period_info.period,
      startDate: reportData.period_info.start_date,
      endDate: reportData.period_info.end_date,
      start_date: reportData.period_info.start_date,
      end_date: reportData.period_info.end_date,
      vehicles: reportData.vehicles,
      summary: reportData.summary,
      transitionLogs: allIssuePeriods,
      dept_head_name: deptHeadData?.name || 'Airport Rescue & Fire Fighting Section Head',
      dept_head_nip: deptHeadData?.nip || null,
      dept_head_signature_url: deptHeadData?.signature_url || null,
    };

    const doc = generateVehicleReadinessReportPdf(payload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="laporan-kesiapan-armada-${reportData.period_info.start_date}-sd-${reportData.period_info.end_date}.pdf"`
    );

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error getVehiclesReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF kesiapan armada: ' + error.message, 500);
  }
};

/**
 * Controller Laporan Rekap Insiden dalam Format PDF (Mendukung Agent 4 di /insiden/laporan)
 * Filter Periode: 1month (default), 3months, 1year, custom
 */
export const getIncidentsReportPdf = async (req, res) => {
  try {
    const { period = '1month', start_date, end_date } = req.query;

    const today = new Date();
    let calculatedStartDate = '';
    let calculatedEndDate = today.toISOString().split('T')[0];

    if (period === '1month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      calculatedStartDate = d.toISOString().split('T')[0];
    } else if (period === '3months') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      calculatedStartDate = d.toISOString().split('T')[0];
    } else if (period === '1year') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      calculatedStartDate = d.toISOString().split('T')[0];
    } else if (period === 'custom' && start_date && end_date) {
      calculatedStartDate = start_date;
      calculatedEndDate = end_date;
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      calculatedStartDate = d.toISOString().split('T')[0];
    }

    // Ambil insiden pada rentang periode
    const [incidentsList] = await pool.query(
      `SELECT i.*, u.name as reporter_name
       FROM incidents i
       LEFT JOIN users u ON u.id = i.reporter_id
       WHERE i.incident_date BETWEEN ? AND ?
       ORDER BY i.incident_date DESC, i.incident_time DESC`,
      [calculatedStartDate, calculatedEndDate]
    );

    // Ambil data pejabat Section Head / Dept Head secara dinamis
    const deptHeadData = await getOfficialSignatory(pool);

    const resolvedCount = incidentsList.filter(
      (i) => i.status === 'resolved' || i.status === 'closed'
    ).length;
    const ongoingCount = incidentsList.length - resolvedCount;

    const payload = {
      period,
      start_date: calculatedStartDate,
      end_date: calculatedEndDate,
      incidents: incidentsList,
      summary: {
        totalIncidents: incidentsList.length,
        resolvedCount,
        ongoingCount,
      },
      dept_head_name: deptHeadData?.name || 'Section Head ARFF',
      dept_head_nip: deptHeadData?.nip || null,
      dept_head_signature_url: deptHeadData?.signature_url || null,
    };

    const doc = generateIncidentSummaryReportPdf(payload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="laporan-rekap-insiden-${calculatedStartDate}-sd-${calculatedEndDate}.pdf"`
    );

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error getIncidentsReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF rekap insiden: ' + error.message, 500);
  }
};

export const getActivitiesReportPdf = async (req, res) => {
  try {
    const { period = '1month', start_date, end_date, category, team_group } = req.query;

    let calculatedStartDate = start_date;
    let calculatedEndDate = end_date;
    let periodLabel = 'Periode Kustom';

    const now = new Date();
    if (period === '1week') {
      periodLabel = '1 Minggu Terakhir';
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      calculatedStartDate = past.toISOString().split('T')[0];
      calculatedEndDate = now.toISOString().split('T')[0];
    } else if (period === '3months') {
      periodLabel = '3 Bulan Terakhir';
      const past = new Date(now);
      past.setMonth(past.getMonth() - 3);
      calculatedStartDate = past.toISOString().split('T')[0];
      calculatedEndDate = now.toISOString().split('T')[0];
    } else if (period === '1year') {
      periodLabel = '1 Tahun Terakhir';
      const past = new Date(now);
      past.setFullYear(past.getFullYear() - 1);
      calculatedStartDate = past.toISOString().split('T')[0];
      calculatedEndDate = now.toISOString().split('T')[0];
    } else if (period === '1month' || (!calculatedStartDate && !calculatedEndDate)) {
      periodLabel = '1 Bulan Terakhir';
      const past = new Date(now);
      past.setMonth(past.getMonth() - 1);
      calculatedStartDate = past.toISOString().split('T')[0];
      calculatedEndDate = now.toISOString().split('T')[0];
    }

    let query = `
      SELECT a.*, ps.shift_date, ps.shift_number, ps.team_group
      FROM daily_shift_activities a
      JOIN personnel_shifts ps ON ps.id = a.shift_id
      WHERE ps.shift_date BETWEEN ? AND ?
    `;
    const params = [calculatedStartDate, calculatedEndDate];

    if (category && category !== 'ALL' && category !== 'all') {
      query += ` AND a.activity_type = ?`;
      params.push(category);
    }

    if (team_group && team_group !== 'ALL' && team_group !== 'all') {
      query += ` AND ps.team_group = ?`;
      params.push(team_group);
    }

    query += ` ORDER BY ps.shift_date DESC, a.activity_time ASC, a.id DESC`;

    const [activitiesList] = await pool.query(query, params);

    // Ambil data pejabat Section Head / Dept Head secara dinamis
    const deptHeadData = await getOfficialSignatory(pool);

    const payload = {
      periodLabel,
      startDate: calculatedStartDate,
      endDate: calculatedEndDate,
      activities: activitiesList,
      summary: {
        total: activitiesList.length,
        categoryLabel: category && category !== 'ALL' ? category.replace(/_/g, ' ').toUpperCase() : 'Semua Kategori',
        teamLabel: team_group && team_group !== 'ALL' ? `Regu ${team_group}` : 'Seluruh Regu (A-D)',
      },
      dept_head_name: deptHeadData?.name || 'Airport Rescue & Fire Fighting Section Head',
      dept_head_nip: deptHeadData?.nip || null,
      dept_head_signature_url: deptHeadData?.signature_url || null,
    };

    const doc = generateActivitiesReportPdf(payload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="laporan-logbook-kegiatan-${calculatedStartDate}-sd-${calculatedEndDate}.pdf"`
    );

    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error getActivitiesReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF logbook kegiatan: ' + error.message, 500);
  }
};


