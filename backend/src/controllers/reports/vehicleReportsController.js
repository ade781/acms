import pool from '../../config/db.js';
import {
  generateVehicleReadinessReportPdf,
  streamPdfToResponse,
} from '../../services/pdfService.js';
import { errorResponse } from '../../utils/responseHelper.js';
import { calculateVehicleTransitionsData } from '../readinessController.js';
import { getOfficialSignatory } from '../../utils/officialHelper.js';

/**
 * Audit log pelacakan kendala armada per shift
 */
export const fetchVehicleIssuesAuditData = async (shiftDate, shiftNumber, currentTeam) => {
  // 1. Kendala unserviceable pada shift saat ini
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

  // 2. Kendaraan yang berhasil dipulihkan pada shift ini
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
       )`,
    [shiftDate, shiftNumber, currentTeam]
  );

  return {
    shift_date: shiftDate,
    shift_number: shiftNumber,
    team_group: currentTeam,
    current_issues: currentIssues,
    backlog_issues: [],
    resolved_this_shift: resolvedThisShift,
  };
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
          duration_days: p.duration_days,
          document_type: p.document_type || null,
          document_url: p.document_url || null,
          document_name: p.document_name || null,
          technician_vendor: p.technician_vendor || null,
          resolution_notes: p.resolution_notes || null,
          issue_description: p.issue_description || null,
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
      dept_head_rank_position: deptHeadData?.rank_position || 'Airport Rescue & Fire Fighting Section Head',
      rank_position: deptHeadData?.rank_position || 'Airport Rescue & Fire Fighting Section Head',
    };

    const doc = await generateVehicleReadinessReportPdf(payload);

    streamPdfToResponse(doc, res, req, {
      filename: `laporan-kesiapan-armada-${reportData.period_info.start_date}-sd-${reportData.period_info.end_date}.pdf`
    });
  } catch (error) {
    console.error('Error getVehiclesReportPdf:', error);
    return errorResponse(res, 'Gagal menerbitkan laporan PDF kesiapan armada: ' + error.message, 500);
  }
};
