import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

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

  let grandTotalTransitions = 0;
  let currentlyServiceableCount = 0;
  let currentlyUnserviceableCount = 0;
  let currentlyUnreportedCount = 0;

  const vehiclesReport = vehicles.map(v => {
    const vLogs = logsByVehicle.get(v.id) || [];
    const priorLog = priorStatusMap.get(v.id);
    
    const incidentLogs = [];
    const issuePeriods = [];
    let currentPeriod = null;
    let lastKnownStatus = 'serviceable';

    // Jika sebelum startDate armada berstatus unserviceable dan belum resolved, bawa sebagai status awal
    if (priorLog && priorLog.status === 'unserviceable' && priorLog.follow_up_status !== 'resolved') {
      lastKnownStatus = 'unserviceable';
      currentPeriod = {
        period_number: 1,
        start_date: priorLog.shift_date,
        start_shift_number: priorLog.shift_number,
        start_team_group: priorLog.team_group,
        justification: priorLog.justification || '-',
        notes: priorLog.notes ? `[Carry-over dari ${priorLog.shift_date}] ` + priorLog.notes : `[Carry-over dari ${priorLog.shift_date}]`,
        reported_by: priorLog.pic_name || '-',
        photo_webp_url: priorLog.photo_webp_url || null,
        unserviceable_shifts_count: 0,
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
      
      if (item.status === 'unserviceable') {
        incidentLogs.push({
          id: item.id,
          shift_date: item.shift_date,
          shift_number: item.shift_number,
          team_group: item.team_group,
          justification: item.justification,
          notes: item.notes,
          photo_webp_url: item.photo_webp_url,
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
              period_number: issuePeriods.length + 1,
              start_date: item.shift_date,
              start_shift_number: item.shift_number,
              start_team_group: item.team_group,
              justification: item.justification || '-',
              notes: item.notes || '',
              reported_by: item.pic_name || '-',
              photo_webp_url: item.photo_webp_url || null,
              unserviceable_shifts_count: 1,
              is_resolved: false,
              resolved_date: null,
              resolved_shift_number: null,
              resolved_team_group: null,
              resolved_by: null,
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
            currentPeriod.resolved_date = item.shift_date;
            currentPeriod.resolved_shift_number = item.shift_number;
            currentPeriod.resolved_team_group = item.team_group;
            currentPeriod.resolved_by = item.pic_name || '-';
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

    const periodCount = issuePeriods.length;
    grandTotalTransitions += periodCount;

    const latestLog = vLogs.length > 0 ? vLogs[vLogs.length - 1] : null;
    let currentStatus = 'belum_dilaporkan';

    if (latestLog && latestLog.status && latestLog.status !== 'belum_dilaporkan') {
      currentStatus = latestLog.status;
    } else {
      // Reverse lookup pada log-log sebelumnya: jika ada kerusakan unserviceable yang belum resolved
      let foundPreviousStatus = false;
      for (let idx = vLogs.length - 1; idx >= 0; idx--) {
        const item = vLogs[idx];
        if (item.status === 'serviceable') {
          foundPreviousStatus = true;
          break;
        }
        if (item.status === 'unserviceable' && item.follow_up_status !== 'resolved') {
          currentStatus = 'unserviceable';
          foundPreviousStatus = true;
          break;
        }
      }

      if (!foundPreviousStatus) {
        if (priorLog && priorLog.status === 'unserviceable' && priorLog.follow_up_status !== 'resolved') {
          currentStatus = 'unserviceable';
        } else {
          // Jika tidak ada carry-over kerusakan, maka status armada tetap 'belum_dilaporkan' (Belum Dicek)
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
      end_date: endDate
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
