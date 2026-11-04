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

const cleanDuplicatePrefixes = (text) => {
  return cleanPrefixes(text);
};

const formatCleanJustification = (category, description, fallback = '-') => {
  const cleanDesc = cleanPrefixes(description);
  return cleanDesc || fallback;
};

/**
 * Helper Perhitungan Laporan Transisi & Kesiapan Armada (Single Source of Truth)
 * Digunakan bersama oleh API JSON (HalamanLaporanArmada.jsx) dan generator PDF (reportController.js)
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

  const [vehicles] = await pool.query(
    `SELECT id, code_name, vehicle_name, category, license_plate, description
     FROM vehicles
     WHERE is_active = 1
     ORDER BY category ASC, code_name ASC`
  );

  // Tarik status terakhir masing-masing armada sebelum startDate untuk memastikan carry-over kendala tidak hilang
  const [priorLogs] = await pool.query(
    `SELECT vrl.vehicle_id, vrl.status, vrl.justification, vrl.notes, vrl.photo_webp_url,
            vrl.follow_up_status, vrl.shift_date, vrl.shift_number, vrl.team_group,
            p.full_name as pic_name, p.nip as pic_nip
     FROM vehicle_readiness_logs vrl
     JOIN (
       SELECT vehicle_id, MAX(CONCAT(shift_date, '_', LPAD(shift_number, 2, '0'))) as max_shift
       FROM vehicle_readiness_logs
       WHERE shift_date < ?
       GROUP BY vehicle_id
     ) latest ON latest.vehicle_id = vrl.vehicle_id
             AND CONCAT(vrl.shift_date, '_', LPAD(vrl.shift_number, 2, '0')) = latest.max_shift
     LEFT JOIN personnel p ON p.id = vrl.pic_personnel_id`,
    [startDate]
  );

  const priorStatusMap = new Map();
  for (const pl of priorLogs) {
    priorStatusMap.set(pl.vehicle_id, pl);
  }

  const [logs] = await pool.query(
    `SELECT vrl.id, vrl.vehicle_id, vrl.shift_date, vrl.shift_number, vrl.team_group,
            vrl.status, vrl.justification, vrl.follow_up_status, vrl.notes, vrl.photo_webp_url,
            vrl.resolved_at, vrl.created_at,
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

  // Tarik catatan pemeliharaan & downtime armada yang relevan dengan rentang periode
  const [maintenanceRecords] = await pool.query(
    `SELECT vmr.id, vmr.vehicle_id, vmr.start_date, vmr.start_shift_number, vmr.start_team_group,
            vmr.reported_by_id, vmr.issue_category, vmr.issue_description, vmr.status,
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

  // Deteksi apakah rentang periode mencakup hari ini / shift operasional berjalan
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
    const priorLog = priorStatusMap.get(v.id);
    
    const incidentLogs = [];
    const issuePeriods = [];
    let currentPeriod = null;
    let lastKnownStatus = 'serviceable';

    // Jika sebelum startDate armada berstatus unserviceable dan belum resolved, bawa sebagai status awal
    if (priorLog && priorLog.status === 'unserviceable' && priorLog.follow_up_status !== 'resolved') {
      lastKnownStatus = 'unserviceable';
      const cleanPriorJustification = cleanDuplicatePrefixes(priorLog.justification || '-');
      currentPeriod = {
        period_number: 1,
        start_date: formatDateOnly(priorLog.shift_date),
        start_shift_number: priorLog.shift_number,
        start_team_group: priorLog.team_group,
        justification: cleanPriorJustification,
        issue_description: cleanPrefixes(priorLog.justification) || null,
        notes: priorLog.notes ? `[Carry-over dari ${formatDateOnly(priorLog.shift_date)}] ` + priorLog.notes : `[Carry-over dari ${formatDateOnly(priorLog.shift_date)}]`,
        reported_by: priorLog.pic_name || '-',
        reported_by_nip: priorLog.pic_nip || null,
        photo_webp_url: priorLog.photo_webp_url || null,
        document_url: null,
        document_name: null,
        document_type: null,
        unserviceable_shifts_count: 1,
        is_resolved: false,
        resolved_date: null,
        resolved_shift_number: null,
        resolved_team_group: null,
        resolved_by: null,
        status: 'ongoing',
        is_carried_from_prior: true
      };
    }

    for (let i = 0; i < vLogs.length; i++) {
      const item = vLogs[i];
      const itemDate = formatDateOnly(item.shift_date);
      
      if (item.status === 'unserviceable') {
        incidentLogs.push({
          id: item.id,
          shift_date: itemDate,
          shift_number: item.shift_number,
          team_group: item.team_group,
          justification: cleanDuplicatePrefixes(item.justification || '-'),
          issue_description: cleanPrefixes(item.justification) || null,
          notes: item.notes,
          photo_webp_url: item.photo_webp_url,
          document_url: null,
          document_name: null,
          document_type: null,
          follow_up_status: item.follow_up_status,
          pic_name: item.pic_name,
          pic_nip: item.pic_nip
        });
      }

      if (item.status && item.status !== 'belum_dilaporkan') {
        if (item.status === 'unserviceable') {
          if (!currentPeriod) {
            // Mulai 1 periode kendala baru
            currentPeriod = {
              id: `log-${item.id}`,
              period_number: issuePeriods.length + 1,
              start_date: itemDate,
              start_shift_number: item.shift_number,
              start_team_group: item.team_group,
              start_log_id: item.id,
              is_maintenance_record: false,
              justification: cleanDuplicatePrefixes(item.justification || '-'),
              issue_description: cleanPrefixes(item.justification) || null,
              notes: item.notes || '',
              reported_by: item.pic_name || '-',
              reported_by_nip: item.pic_nip || null,
              photo_webp_url: item.photo_webp_url || null,
              document_url: null,
              document_name: null,
              document_type: null,
              unserviceable_shifts_count: 1,
              is_resolved: false,
              resolved_date: null,
              resolved_shift_number: null,
              resolved_team_group: null,
              resolved_by: null,
              resolved_by_nip: null,
              status: 'ongoing'
            };
          } else {
            currentPeriod.unserviceable_shifts_count++;
            if (item.notes && !currentPeriod.notes.includes(item.notes)) {
              currentPeriod.notes += (currentPeriod.notes ? ' • ' : '') + item.notes;
            }
          }
          lastKnownStatus = 'unserviceable';
        } else if (item.status === 'serviceable') {
          if (currentPeriod) {
            // Pulih kembali: siklus 1 periode kendala ditutup
            currentPeriod.is_resolved = true;
            currentPeriod.resolved_date = itemDate;
            currentPeriod.resolved_shift_number = item.shift_number;
            currentPeriod.resolved_team_group = item.team_group;
            currentPeriod.resolved_by = item.pic_name || '-';
            currentPeriod.resolved_by_nip = item.pic_nip || null;
            currentPeriod.resolution_notes = item.notes || null;
            currentPeriod.resolved_log_id = item.id;
            currentPeriod.status = 'resolved';
            issuePeriods.push(currentPeriod);
            currentPeriod = null;
          }
          lastKnownStatus = 'serviceable';
        }
      }
    }

    // Jika ada periode kendala yang belum sembuh hingga akhir filter periode
    if (currentPeriod) {
      issuePeriods.push(currentPeriod);
    }

    // Integrasikan data dari vehicle_maintenance_records
    for (const m of vMaintenance) {
      const mStartDate = formatDateOnly(m.start_date);
      const mEndDate = formatDateOnly(m.end_date);
      const mIsOngoing = m.status === 'ongoing' || !m.end_date;
      const cleanDesc = cleanPrefixes(m.issue_description) || m.issue_description || '-';
      const cleanJustification = formatCleanJustification(m.issue_category, cleanDesc);

      // Cari apakah tiket pemeliharaan cocok/beririsan dengan periode kendala yang tercatat dari log
      // PENTING: Jangan overwrite tiket yang sudah terhubung (p.maintenance_id harus belum ada)
      const matchedPeriod = issuePeriods.find(p => {
        if (p.maintenance_id) return false;
        const pStart = formatDateOnly(p.start_date);
        const pEnd = formatDateOnly(p.resolved_date) || todayStr;
        return mStartDate === pStart || (mStartDate >= pStart && mStartDate <= pEnd);
      });

      if (matchedPeriod) {
        matchedPeriod.id = m.id;
        matchedPeriod.maintenance_id = m.id;
        matchedPeriod.is_maintenance_record = true;
        matchedPeriod.field_justification = matchedPeriod.justification;
        matchedPeriod.issue_description = cleanDesc;
        matchedPeriod.justification = cleanJustification;
        if (m.reported_by_id) matchedPeriod.reported_by_id = m.reported_by_id;
        if (m.resolved_by_id) matchedPeriod.resolved_by_id = m.resolved_by_id;
        if (m.document_type) matchedPeriod.document_type = m.document_type;
        if (m.document_url) matchedPeriod.document_url = m.document_url;
        if (m.document_name) matchedPeriod.document_name = m.document_name;
        if (m.technician_vendor) matchedPeriod.technician_vendor = m.technician_vendor;
        matchedPeriod.issue_category = null;
        if (m.reported_by_name) matchedPeriod.reported_by = m.reported_by_name;
        if (m.reported_by_nip) matchedPeriod.reported_by_nip = m.reported_by_nip;
        if (m.resolution_notes) matchedPeriod.resolution_notes = m.resolution_notes;

        if (mIsOngoing) {
          matchedPeriod.status = 'ongoing';
          matchedPeriod.is_resolved = false;
          matchedPeriod.resolved_date = null;
        } else if (m.status === 'resolved' && !matchedPeriod.is_resolved) {
          matchedPeriod.status = 'resolved';
          matchedPeriod.is_resolved = true;
          matchedPeriod.resolved_date = mEndDate || matchedPeriod.resolved_date || todayStr;
          matchedPeriod.resolved_shift_number = m.end_shift_number || matchedPeriod.resolved_shift_number || 1;
          matchedPeriod.resolved_team_group = m.end_team_group || matchedPeriod.resolved_team_group || '-';
          matchedPeriod.resolved_by = m.resolved_by_name || matchedPeriod.resolved_by || '-';
          matchedPeriod.resolved_by_nip = m.resolved_by_nip || matchedPeriod.resolved_by_nip || null;
        }
      } else {
        // Tiket pemeliharaan belum tercakup dalam log kesiapan, langsung daftarkan sebagai issue period
        issuePeriods.push({
          id: m.id,
          period_number: 0,
          maintenance_id: m.id,
          is_maintenance_record: true,
          start_date: mStartDate,
          start_shift_number: m.start_shift_number || 1,
          start_team_group: m.start_team_group || '-',
          reported_by_id: m.reported_by_id || null,
          issue_description: cleanDesc,
          justification: cleanJustification,
          field_justification: null,
          resolution_notes: m.resolution_notes || null,
          notes: m.resolution_notes || '',
          reported_by: m.reported_by_name || '-',
          reported_by_nip: m.reported_by_nip || null,
          photo_webp_url: null,
          document_url: m.document_url || null,
          document_name: m.document_name || null,
          document_type: m.document_type || 'dokumen',
          issue_category: null,
          technician_vendor: m.technician_vendor || null,
          unserviceable_shifts_count: mIsOngoing ? calculateDaysDifference(mStartDate, todayStr) : calculateDaysDifference(mStartDate, mEndDate),
          is_resolved: !mIsOngoing,
          resolved_date: mEndDate,
          resolved_shift_number: m.end_shift_number || null,
          resolved_team_group: m.end_team_group || null,
          resolved_by_id: m.resolved_by_id || null,
          resolved_by: m.resolved_by_name || null,
          resolved_by_nip: m.resolved_by_nip || null,
          status: mIsOngoing ? 'ongoing' : 'resolved'
        });
      }

      // Pastikan rekam insiden pemeliharaan tercatat di incidentLogs jika belum ada
      const alreadyInIncidentLogs = incidentLogs.some(
        log => (log.maintenance_id && log.maintenance_id === m.id) ||
               (formatDateOnly(log.shift_date) === mStartDate && 
                (log.justification?.includes(cleanDesc) || log.notes?.includes(cleanDesc)))
      );

      if (!alreadyInIncidentLogs) {
        incidentLogs.push({
          id: `m-${m.id}`,
          maintenance_id: m.id,
          shift_date: mStartDate,
          shift_number: m.start_shift_number || 1,
          team_group: m.start_team_group || '-',
          justification: cleanJustification,
          issue_description: cleanDesc,
          notes: m.resolution_notes || '',
          photo_webp_url: null,
          document_url: m.document_url || null,
          document_name: m.document_name || null,
          document_type: m.document_type || 'ba_kerusakan',
          follow_up_status: m.status === 'resolved' ? 'resolved' : 'pending',
          pic_name: m.reported_by_name || '-',
          pic_nip: m.reported_by_nip || '-'
        });
      }
    }

    // Urutkan issuePeriods kronologis, hitung durasi hari berjalan & shift, serta re-indeks period_number
    issuePeriods.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    issuePeriods.forEach((p, idx) => {
      p.period_number = idx + 1;
      p.start_date = formatDateOnly(p.start_date);
      p.resolved_date = formatDateOnly(p.resolved_date);
      p.document_url = p.document_url || null;
      p.document_name = p.document_name || null;
      p.document_type = p.document_type || (p.document_url ? 'ba_kerusakan' : null);
      const isOngoing = p.status === 'ongoing' || !p.is_resolved;
      p.duration_days = isOngoing
        ? calculateDaysDifference(p.start_date, todayStr)
        : calculateDaysDifference(p.start_date, p.resolved_date || p.start_date);

      // Hitung unserviceable_shifts_count yang akurat dan konsisten
      const relevantLogs = vLogs.filter(l => {
        const lDate = formatDateOnly(l.shift_date);
        const inDateRange = isOngoing
          ? (lDate >= p.start_date && lDate <= todayStr)
          : (lDate >= p.start_date && lDate <= (p.resolved_date || p.start_date));
        return inDateRange && l.status === 'unserviceable';
      });

      if (relevantLogs.length > 0) {
        p.unserviceable_shifts_count = Math.max(relevantLogs.length, p.unserviceable_shifts_count || 1);
      } else {
        p.unserviceable_shifts_count = Math.max(1, p.unserviceable_shifts_count || p.duration_days || 1);
      }
    });

    // Urutkan incidentLogs kronologis (terbaru di paling atas / indeks 0)
    incidentLogs.sort((a, b) => {
      const dateA = new Date(a.shift_date).getTime();
      const dateB = new Date(b.shift_date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      const shiftA = Number(a.shift_number || 1);
      const shiftB = Number(b.shift_number || 1);
      if (shiftB !== shiftA) return shiftB - shiftA;
      const idA = typeof a.id === 'number' ? a.id : parseInt(String(a.id).replace(/\D/g, '') || '0', 10);
      const idB = typeof b.id === 'number' ? b.id : parseInt(String(b.id).replace(/\D/g, '') || '0', 10);
      return idB - idA;
    });

    const periodCount = issuePeriods.length;
    grandTotalTransitions += periodCount;

    let currentStatus = 'belum_dilaporkan';

    if (isCurrentPeriod) {
      // Periode aktif mencakup hari ini / shift berjalan:
      // 1. Cek apakah ada kendala/tiket pemeliharaan yang ongoing
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
          // Belum ada pemeriksaan fisik pada shift aktif hari ini: default "belum_dilaporkan" (Belum Dicek)
          currentStatus = 'belum_dilaporkan';
        }
      }
    } else {
      // Periode historis di masa lalu (endDate < todayStr):
      const hasOngoingIssue = issuePeriods.some(p => p.status === 'ongoing' || !p.is_resolved);
      if (hasOngoingIssue) {
        currentStatus = 'unserviceable';
      } else {
        const latestLog = vLogs.length > 0 ? vLogs[vLogs.length - 1] : null;
        if (latestLog && latestLog.status && latestLog.status !== 'belum_dilaporkan') {
          currentStatus = latestLog.status;
        } else if (priorLog && priorLog.status === 'unserviceable' && priorLog.follow_up_status !== 'resolved') {
          currentStatus = 'unserviceable';
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
