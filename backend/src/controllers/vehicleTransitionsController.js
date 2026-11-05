import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

const formatDateOnly = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
};

const calculateDaysDifference = (d1, d2) => {
  if (!d1 || !d2) return 1;
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  if (isNaN(t1) || isNaN(t2)) return 1;
  const diffDays = Math.round(Math.abs(t2 - t1) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1); // inklusif hari berjalan
};

const cleanPrefixes = (text) => {
  if (!text) return '';
  let str = String(text).trim();
  while (/^\[[^\]]+\]\s*/.test(str)) {
    str = str.replace(/^\[[^\]]+\]\s*/, '').trim();
  }
  return str;
};

/**
 * Helper Perhitungan Laporan Transisi & Kesiapan Armada (Single Source of Truth)
 * Digunakan bersama oleh API JSON (HalamanLaporanArmada.jsx) dan generator PDF (reportController.js)
 * Sumber utama periode kendala / pemeliharaan adalah vehicle_maintenance_records.
 */
export const calculateVehicleTransitionsData = async ({ period = '1month', start_date, end_date } = {}) => {
  let startDate, endDate;
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);

  if (start_date && end_date) {
    startDate = start_date;
    endDate = end_date;
  } else {
    endDate = todayStr;
    const d = new Date(now);
    if (period === '3months') {
      d.setDate(d.getDate() - 90);
    } else if (period === '1year') {
      d.setDate(d.getDate() - 365);
    } else {
      d.setDate(d.getDate() - 30);
    }
    startDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
  }

  // Ambil daftar seluruh armada aktif dengan urutan utama -> pendukung -> posko
  const [vehicles] = await pool.query(
    `SELECT id, code_name, vehicle_name, category, license_plate, description
     FROM vehicles
     WHERE is_active = 1
     ORDER BY 
       CASE category 
         WHEN 'utama' THEN 1 
         WHEN 'pendukung' THEN 2 
         WHEN 'posko' THEN 3 
         ELSE 4 
       END, 
       code_name ASC`
  );

  // Ambil log kesiapan armada dalam rentang tanggal
  const [logs] = await pool.query(
    `SELECT vrl.id, vrl.vehicle_id, vrl.shift_date, vrl.shift_number, vrl.team_group,
            vrl.status, vrl.justification, vrl.follow_up_status, vrl.notes, vrl.photo_webp_url,
            vrl.resolved_at, vrl.created_at, vrl.updated_at,
            p.full_name as pic_name, p.nip as pic_nip
     FROM vehicle_readiness_logs vrl
     LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id
     WHERE vrl.shift_date BETWEEN ? AND ?
     ORDER BY vrl.shift_date ASC, vrl.shift_number ASC, vrl.id ASC`,
    [startDate, endDate]
  );

  const logsByVehicle = new Map();
  for (const log of logs) {
    if (!logsByVehicle.has(log.vehicle_id)) {
      logsByVehicle.set(log.vehicle_id, []);
    }
    logsByVehicle.get(log.vehicle_id).push(log);
  }

  // Ambil catatan pemeliharaan & kendala armada (Single Source of Truth untuk issue periods)
  const [maintenanceRecords] = await pool.query(
    `SELECT vmr.id, vmr.vehicle_id, vmr.start_date, vmr.start_shift_number, vmr.start_team_group,
            vmr.reported_by_id, vmr.issue_description, vmr.status,
            vmr.end_date, vmr.end_shift_number, vmr.end_team_group, vmr.resolved_by_id,
            vmr.resolution_notes, vmr.technician_vendor, vmr.document_type, vmr.document_url, vmr.document_name,
            vmr.created_at, vmr.updated_at,
            p_rep.full_name as reported_by_name, p_rep.nip as reported_by_nip,
            p_res.full_name as resolved_by_name, p_res.nip as resolved_by_nip
     FROM vehicle_maintenance_records vmr
     LEFT JOIN personnel p_rep ON p_rep.id = vmr.reported_by_id
     LEFT JOIN personnel p_res ON p_res.id = vmr.resolved_by_id
     WHERE vmr.start_date <= ? AND (vmr.end_date >= ? OR vmr.end_date IS NULL OR vmr.status = 'ongoing')
     ORDER BY vmr.start_date ASC, vmr.id ASC`,
    [endDate, startDate]
  );

  const maintenanceByVehicle = new Map();
  for (const m of maintenanceRecords) {
    if (!maintenanceByVehicle.has(m.vehicle_id)) {
      maintenanceByVehicle.set(m.vehicle_id, []);
    }
    maintenanceByVehicle.get(m.vehicle_id).push(m);
  }

  // Deteksi status shift operasional berjalan saat ini
  const isCurrentPeriod = endDate >= todayStr;
  let activeShiftDate = todayStr;
  let activeShiftNumber = 1;
  const activeLogMap = new Map();
  const carryOverMap = new Map();

  if (isCurrentPeriod) {
    const [activeShiftRows] = await pool.query(
      'SELECT shift_date, shift_number, team_group FROM personnel_shifts ORDER BY id DESC LIMIT 1'
    );
    if (activeShiftRows.length > 0) {
      activeShiftDate = formatDateOnly(activeShiftRows[0].shift_date) || todayStr;
      activeShiftNumber = Number(activeShiftRows[0].shift_number) || 1;
    }

    const [activeLogs] = await pool.query(
      `SELECT vehicle_id, status, follow_up_status
       FROM vehicle_readiness_logs
       WHERE shift_date = ? AND shift_number = ?`,
      [activeShiftDate, activeShiftNumber]
    );
    for (const al of activeLogs) {
      activeLogMap.set(al.vehicle_id, al);
    }

    const [carryOverRows] = await pool.query(
      `SELECT vrl.vehicle_id, vrl.status, vrl.follow_up_status
       FROM vehicle_readiness_logs vrl
       JOIN (
         SELECT vehicle_id, MAX(CONCAT(shift_date, '_', LPAD(shift_number, 2, '0'))) as max_shift
         FROM vehicle_readiness_logs
         WHERE (shift_date < ? OR (shift_date = ? AND shift_number < ?))
           AND status = 'unserviceable'
           AND follow_up_status != 'resolved'
         GROUP BY vehicle_id
       ) latest ON latest.vehicle_id = vrl.vehicle_id
               AND CONCAT(vrl.shift_date, '_', LPAD(vrl.shift_number, 2, '0')) = latest.max_shift
       WHERE vrl.status = 'unserviceable'
         AND vrl.follow_up_status != 'resolved'`,
      [activeShiftDate, activeShiftDate, activeShiftNumber]
    );
    for (const co of carryOverRows) {
      carryOverMap.set(co.vehicle_id, co);
    }
  }

  let grandTotalTransitions = 0;
  let currentlyServiceableCount = 0;
  let currentlyUnserviceableCount = 0;
  let currentlyUnreportedCount = 0;

  const vehiclesReport = vehicles.map(v => {
    const vLogs = logsByVehicle.get(v.id) || [];
    const vMaintenance = maintenanceByVehicle.get(v.id) || [];

    // 1. Rekam kejadian unserviceable fisik dari log kesiapan shift
    const incidentLogs = vLogs
      .filter(l => l.status === 'unserviceable')
      .map(item => ({
        id: item.id,
        shift_date: formatDateOnly(item.shift_date),
        shift_number: item.shift_number,
        team_group: item.team_group,
        justification: cleanPrefixes(item.justification) || item.justification || '-',
        issue_description: cleanPrefixes(item.justification) || null,
        notes: item.notes,
        photo_webp_url: item.photo_webp_url,
        follow_up_status: item.follow_up_status,
        pic_name: item.pic_name || '-',
        pic_nip: item.pic_nip || '-',
        created_at: item.created_at,
        updated_at: item.updated_at,
        resolved_at: item.resolved_at
      }))
      .sort((a, b) => {
        const dateA = new Date(a.shift_date).getTime();
        const dateB = new Date(b.shift_date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.shift_number || 1) - (a.shift_number || 1);
      });

    // 2. Single Source of Truth: Periode kendala dari vehicle_maintenance_records
    const maintenanceIssuePeriods = vMaintenance.map((m, idx) => {
      const mStartDate = formatDateOnly(m.start_date);
      const mEndDate = formatDateOnly(m.end_date);
      const isOngoing = m.status === 'ongoing' || !m.end_date;
      const cleanDesc = cleanPrefixes(m.issue_description) || m.issue_description || '-';
      const durationDays = isOngoing
        ? calculateDaysDifference(mStartDate, todayStr)
        : calculateDaysDifference(mStartDate, mEndDate || mStartDate);

      const matchingLogsCount = vLogs.filter(l => {
        const lDate = formatDateOnly(l.shift_date);
        const inRange = isOngoing
          ? (lDate >= mStartDate && lDate <= todayStr)
          : (lDate >= mStartDate && lDate <= (mEndDate || mStartDate));
        return inRange && l.status === 'unserviceable';
      }).length;

      const matchingLog = vLogs.find(l => {
        const lDate = formatDateOnly(l.shift_date);
        const inRange = isOngoing
          ? (lDate >= mStartDate && lDate <= todayStr)
          : (lDate >= mStartDate && lDate <= (mEndDate || mStartDate));
        return inRange && l.status === 'unserviceable' && l.justification;
      });

      return {
        id: m.id,
        period_number: idx + 1,
        maintenance_id: m.id,
        is_maintenance_record: true,
        start_date: mStartDate,
        start_shift_number: m.start_shift_number || 1,
        start_team_group: m.start_team_group || '-',
        reported_by_id: m.reported_by_id || null,
        issue_description: cleanDesc,
        justification: cleanDesc,
        field_justification: matchingLog ? (cleanPrefixes(matchingLog.justification) || matchingLog.justification) : cleanDesc,
        notes: m.resolution_notes || '',
        resolution_notes: m.resolution_notes || null,
        reported_by: m.reported_by_name || '-',
        reported_by_nip: m.reported_by_nip || null,
        photo_webp_url: null,
        document_url: m.document_url || null,
        document_name: m.document_name || null,
        document_type: m.document_type || (m.document_url ? 'ba_kerusakan' : null),
        technician_vendor: m.technician_vendor || null,
        duration_days: durationDays,
        unserviceable_shifts_count: Math.max(matchingLogsCount, durationDays, 1),
        is_resolved: !isOngoing,
        resolved_date: isOngoing ? null : (mEndDate || mStartDate),
        resolved_shift_number: isOngoing ? null : (m.end_shift_number || 1),
        resolved_team_group: isOngoing ? null : (m.end_team_group || '-'),
        resolved_by_id: isOngoing ? null : (m.resolved_by_id || null),
        resolved_by: isOngoing ? null : (m.resolved_by_name || '-'),
        resolved_by_nip: isOngoing ? null : (m.resolved_by_nip || null),
        status: isOngoing ? 'ongoing' : 'resolved',
        created_at: m.created_at || null
      };
    });

    // Sinkronkan episode log kendala (status === 'unserviceable') di vehicle_readiness_logs yang belum terdaftar di maintenance_records
    const unrecordedLogs = incidentLogs.filter(item => {
      const lDate = item.shift_date;
      return !vMaintenance.some(m => {
        const mStartDate = formatDateOnly(m.start_date);
        const mEndDate = formatDateOnly(m.end_date);
        const isOngoing = m.status === 'ongoing' || !m.end_date;
        if (isOngoing) {
          return lDate >= mStartDate && lDate <= todayStr;
        } else {
          return lDate >= mStartDate && lDate <= (mEndDate || mStartDate);
        }
      });
    });

    const synthesizedPeriods = unrecordedLogs.map(item => {
      const lDate = item.shift_date;
      const isResolved = item.follow_up_status === 'resolved' || Boolean(item.resolved_at);
      const isOngoing = !isResolved;
      const durationDays = isOngoing
        ? calculateDaysDifference(lDate, todayStr)
        : 1;

      // Cari log pemulihan (serviceable log pertama pada atau setelah unserviceable log ini)
      let resolvingLog = null;
      if (isResolved) {
        resolvingLog = vLogs.find(l => {
          if (l.status !== 'serviceable') return false;
          const rDate = formatDateOnly(l.shift_date);
          if (rDate > lDate) return true;
          if (rDate === lDate && (l.shift_number || 1) >= (item.shift_number || 1)) return true;
          return false;
        });
      }

      return {
        id: `log-${item.id}`,
        period_number: 0,
        maintenance_id: null,
        is_maintenance_record: false,
        start_date: lDate,
        start_shift_number: item.shift_number || 1,
        start_team_group: item.team_group || '-',
        reported_by_id: null,
        issue_description: item.issue_description || cleanPrefixes(item.justification) || item.justification || '-',
        justification: cleanPrefixes(item.justification) || item.justification || '-',
        field_justification: item.justification || '-',
        notes: item.notes || '',
        resolution_notes: isResolved
          ? (resolvingLog?.notes || item.notes || 'Kendala terselesaikan pada pemeriksaan operasional')
          : null,
        reported_by: item.pic_name || '-',
        reported_by_nip: item.pic_nip || null,
        photo_webp_url: item.photo_webp_url || null,
        document_url: null,
        document_name: null,
        document_type: null,
        technician_vendor: null,
        duration_days: durationDays,
        unserviceable_shifts_count: 1,
        is_resolved: isResolved,
        resolved_date: isResolved
          ? (resolvingLog ? formatDateOnly(resolvingLog.shift_date) : formatDateOnly(item.resolved_at || item.shift_date))
          : null,
        resolved_shift_number: isResolved
          ? (resolvingLog ? Number(resolvingLog.shift_number || 1) : (item.shift_number || 1))
          : null,
        resolved_team_group: isResolved
          ? (resolvingLog ? (resolvingLog.team_group || '-') : (item.team_group || '-'))
          : null,
        resolved_by_id: null,
        resolved_by: isResolved
          ? (resolvingLog ? (resolvingLog.pic_name || '-') : (item.pic_name || '-'))
          : '-',
        resolved_by_nip: isResolved
          ? (resolvingLog ? (resolvingLog.pic_nip || null) : (item.pic_nip || null))
          : null,
        status: isOngoing ? 'ongoing' : 'resolved',
        created_at: item.created_at || null,
        logged_at: item.updated_at || item.created_at || null
      };
    });

    // Gabungkan riwayat pemeliharaan dan episode log kendala, urutkan kronologis
    const combinedPeriods = [...maintenanceIssuePeriods, ...synthesizedPeriods].sort((a, b) => {
      const dateA = new Date(a.start_date).getTime();
      const dateB = new Date(b.start_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.start_shift_number || 1) - (b.start_shift_number || 1);
    });

    combinedPeriods.forEach((p, idx) => {
      p.period_number = idx + 1;
    });

    const issuePeriods = combinedPeriods;

    const periodCount = issuePeriods.length;
    grandTotalTransitions += periodCount;

    // 3. Tentukan status armada saat ini
    let currentStatus = 'belum_dilaporkan';

    if (isCurrentPeriod) {
      const hasOngoingIssue = issuePeriods.some(p => p.status === 'ongoing' || !p.is_resolved);
      if (hasOngoingIssue) {
        currentStatus = 'unserviceable';
      } else {
        const activeLog = activeLogMap.get(v.id);
        if (activeLog && activeLog.status && activeLog.status !== 'belum_dilaporkan') {
          currentStatus = activeLog.status;
        } else if (carryOverMap.has(v.id)) {
          currentStatus = 'unserviceable';
        } else {
          currentStatus = 'belum_dilaporkan';
        }
      }
    } else {
      const hasOngoingIssue = issuePeriods.some(p => p.status === 'ongoing' || !p.is_resolved);
      if (hasOngoingIssue) {
        currentStatus = 'unserviceable';
      } else {
        const latestLog = vLogs.length > 0 ? vLogs[vLogs.length - 1] : null;
        if (latestLog && latestLog.status && latestLog.status !== 'belum_dilaporkan') {
          currentStatus = latestLog.status;
        } else {
          currentStatus = 'belum_dilaporkan';
        }
      }
    }

    if (currentStatus === 'unserviceable') {
      currentlyUnserviceableCount++;
    } else if (currentStatus === 'serviceable') {
      currentlyServiceableCount++;
    } else {
      currentlyUnreportedCount++;
    }

    const totalServiceableShifts = vLogs.filter(l => l.status === 'serviceable').length;
    const totalUnserviceableShifts = vLogs.filter(l => l.status === 'unserviceable').length;

    return {
      id: v.id,
      vehicle_id: v.id,
      code_name: v.code_name,
      vehicle_name: v.vehicle_name,
      category: v.category,
      license_plate: v.license_plate,
      description: v.description,
      current_status: currentStatus,
      status: currentStatus,
      transition_count: periodCount,
      period_count: periodCount,
      issue_periods: issuePeriods,
      ongoing_issues_count: issuePeriods.filter(p => !p.is_resolved).length,
      resolved_issues_count: issuePeriods.filter(p => p.is_resolved).length,
      unserviceable_count: totalUnserviceableShifts,
      serviceable_count: totalServiceableShifts,
      total_logs: vLogs.length,
      incident_logs: incidentLogs,
      transitions: issuePeriods
    };
  });

  return {
    period_info: {
      period: start_date && end_date ? 'custom' : period,
      start_date: startDate,
      end_date: endDate,
      is_current_period: isCurrentPeriod
    },
    summary: {
      total_vehicles: vehicles.length,
      total_transitions: grandTotalTransitions,
      currently_serviceable: currentlyServiceableCount,
      currently_unserviceable: currentlyUnserviceableCount,
      currently_unreported: currentlyUnreportedCount,
    },
    vehicles: vehiclesReport
  };
};

export const getVehicleTransitionsReport = async (req, res) => {
  try {
    const { period = '1month', start_date, end_date } = req.query;
    const reportData = await calculateVehicleTransitionsData({ period, start_date, end_date });
    return successResponse(res, 'Laporan transisi kesiapan armada berhasil dihitung', reportData);
  } catch (error) {
    console.error('Error getVehicleTransitionsReport:', error);
    return errorResponse(res, 'Gagal mengambil laporan transisi armada: ' + error.message, 500);
  }
};
