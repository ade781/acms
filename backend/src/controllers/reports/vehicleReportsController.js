import pool from '../../config/db.js';
import {
  generateVehicleReadinessReportPdf,
} from '../../services/pdfService.js';
import { errorResponse } from '../../utils/responseHelper.js';
import { calculateVehicleTransitionsData } from '../readinessController.js';
import { getOfficialSignatory } from '../../utils/officialHelper.js';

/**
 * Audit log pelacakan kendala armada per shift
 */
export const fetchVehicleIssuesAuditData = async (shiftDate, shiftNumber, currentTeam) => {
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

  const backlogIssues = [];
  const seenVehicle = new Set();

  for (const item of rawBacklog) {
    if (handledVehicleIds.has(item.vehicle_id) || seenVehicle.has(item.vehicle_id)) {
      continue;
    }
    const itemKey = `${item.shift_date} ${String(item.shift_number).padStart(2, '0')}`;
    const latestServ = serviceableMap.get(item.vehicle_id);
    if (latestServ && latestServ > itemKey) {
      continue;
    }
    seenVehicle.add(item.vehicle_id);
    backlogIssues.push(item);
  }

  return {
    shift_date: shiftDate,
    shift_number: shiftNumber,
    team_group: currentTeam,
    current_issues: currentIssues,
    backlog_issues: backlogIssues,
    resolved_this_shift: resolvedThisShift
  };
};

export const getVehicleIssuesAudit = async (req, res) => {
  try {
    const { date, shift, team_group } = req.query;
    const shiftDate = date || new Date().toISOString().split('T')[0];
    const shiftNumber = shift ? Number(shift) : 1;
    const currentTeam = team_group || 'Alpha';

    const data = await fetchVehicleIssuesAuditData(shiftDate, shiftNumber, currentTeam);

    return res.json({
      success: true,
      message: 'Data pelacakan kendala armada berhasil diambil',
      data
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

    const reportData = await calculateVehicleTransitionsData({ period, start_date, end_date });
    const deptHeadData = await getOfficialSignatory(pool);

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

    const doc = await generateVehicleReadinessReportPdf(payload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="laporan-kesiapan-armada-${reportData.period_info.start_date}-sd-${reportData.period_info.end_date}.pdf"`
    );

    doc.on('error', (err) => {
      console.error('PDFKit stream error (VehicleReportPdf):', err);
      if (!res.headersSent) {
        return errorResponse(res, 'Gagal menerbitkan laporan PDF kesiapan armada: ' + err.message, 500);
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
    console.error('Error getVehiclesReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF kesiapan armada: ' + error.message, 500);
  }
};

