import api from './api';
import { cleanTeam, getDailyRoster } from '../utils/shiftHelper';
import { downloadBlob } from '../utils/fileHelper';

/**
 * Service Terpadu Rekapitulasi Laporan Dinas Operasional Harian ARFF YIA (24 Jam)
 * Single Source of Truth (DRY) untuk penarikan data laporan lintas perangkat (Desktop & Mobile)
 * Merangkum 3 Shift dan 3 Regu Dinas (Shift 1 Pagi, Shift 2 Siang, Shift 3 Malam, dan Regu Off) dalam 1 Tanggal
 */
export async function fetchShiftReportData({ date, shift, team, signal } = {}) {
  const currentDate = date || new Date().toISOString().split('T')[0];
  const roster = getDailyRoster(currentDate);

  // Helper untuk unifikasi Posko Komunikasi ke dalam list armada
  const unifyVehicles = (rawVehicles = [], watchroomData = {}) => {
    let vehicles = Array.isArray(rawVehicles) ? [...rawVehicles] : [];
    const hasPosko = vehicles.some((v) => v.category === 'posko' || v.code_name === 'WATCHROOM');
    if (!hasPosko && (watchroomData.status || watchroomData.vehicle_name || watchroomData.code_name)) {
      vehicles.push({
        id: watchroomData.id || 'WATCHROOM',
        code_name: watchroomData.code_name || 'WATCHROOM',
        vehicle_name: watchroomData.vehicle_name || 'Posko Komunikasi ARFF',
        category: 'posko',
        status: watchroomData.status || 'belum_dilaporkan',
        justification: watchroomData.notes || watchroomData.justification || '',
        pic_name: watchroomData.pic_name || watchroomData.inspector_name || 'Belum Ditunjuk',
        ...watchroomData,
      });
    }
    return vehicles;
  };

  // 1. Coba panggil /reports/shift-summary dengan parameter date
  let s1Data = null;
  let s2Data = null;
  let s3Data = null;
  let deptHeadData = null;
  let vehicleIssues = { current_issues: [], backlog_issues: [], resolved_this_shift: [] };

  try {
    const singleCall = await api.get('/reports/shift-summary', {
      params: { date: currentDate },
      ...(signal ? { signal } : {}),
    });
    const sData = singleCall.data?.data || singleCall.data || {};

    // Jika backend sudah mengembalikan format 24 jam terpadu (memiliki shiftsData / roster)
    if (sData.roster && (sData.shiftsData || sData.shifts)) {
      return {
        roster: sData.roster,
        deptHeadData: sData.dept_head || sData.official || null,
        shiftsData: sData.shiftsData || sData.shifts || {},
        vehiclesDaily: sData.vehiclesDaily || sData.vehicles || [],
        activities24h: sData.activities24h || sData.activities || [],
        incidents24h: sData.incidents24h || sData.incidents || [],
        absents24h: sData.absents24h || sData.absents || [],
        vehicleIssues: sData.vehicle_issues || vehicleIssues,
        // Backward compatibility
        shiftData: sData.shift || null,
        deployments: sData.deployments || [],
        absents: sData.absents || [],
        vehicles: sData.vehicles || [],
        watchroomData: sData.watchroom || {},
        activities: sData.activities || [],
        incidents: sData.incidents || [],
      };
    }

    // Jika backend mengembalikan 1 shift dari panggilan pertama
    s1Data = sData;
    deptHeadData = sData.dept_head || sData.official || null;
    if (sData.vehicle_issues) {
      vehicleIssues = sData.vehicle_issues;
    }
  } catch (err) {
    // Abaikan jika error terjadi, lanjutkan ke pemanggilan paralel 3 shift
  }

  // 2. Ambil data 3 Shift secara paralel (Shift 1, Shift 2, Shift 3) sesuai rotasi roster 8 hari ARFF
  const [res1, res2, res3] = await Promise.all([
    s1Data
      ? Promise.resolve({ data: { data: s1Data } })
      : api.get('/reports/shift-summary', {
          params: { date: currentDate, shift: 1, team_group: roster.shift1 },
          ...(signal ? { signal } : {}),
        }),
    api.get('/reports/shift-summary', {
      params: { date: currentDate, shift: 2, team_group: roster.shift2 },
      ...(signal ? { signal } : {}),
    }),
    api.get('/reports/shift-summary', {
      params: { date: currentDate, shift: 3, team_group: roster.shift3 },
      ...(signal ? { signal } : {}),
    }),
  ]);

  const d1 = res1.data?.data || res1.data || {};
  const d2 = res2.data?.data || res2.data || {};
  const d3 = res3.data?.data || res3.data || {};

  deptHeadData = deptHeadData || d1.dept_head || d1.official || d2.dept_head || d3.dept_head || null;
  if (!vehicleIssues.current_issues?.length && d1.vehicle_issues) {
    vehicleIssues = d1.vehicle_issues;
  }

  const s1Vehicles = unifyVehicles(d1.vehicles, d1.watchroom || {});
  const s2Vehicles = unifyVehicles(d2.vehicles, d2.watchroom || {});
  const s3Vehicles = unifyVehicles(d3.vehicles, d3.watchroom || {});

  const s1Deployments = Array.isArray(d1.deployments) ? d1.deployments : [];
  const s2Deployments = Array.isArray(d2.deployments) ? d2.deployments : [];
  const s3Deployments = Array.isArray(d3.deployments) ? d3.deployments : [];

  const s1Absents = Array.isArray(d1.absents) ? d1.absents : [];
  const s2Absents = Array.isArray(d2.absents) ? d2.absents : [];
  const s3Absents = Array.isArray(d3.absents) ? d3.absents : [];

  const s1Activities = Array.isArray(d1.activities) ? d1.activities : [];
  const s2Activities = Array.isArray(d2.activities) ? d2.activities : [];
  const s3Activities = Array.isArray(d3.activities) ? d3.activities : [];

  const s1Incidents = Array.isArray(d1.incidents) ? d1.incidents : [];
  const s2Incidents = Array.isArray(d2.incidents) ? d2.incidents : [];
  const s3Incidents = Array.isArray(d3.incidents) ? d3.incidents : [];

  // Struktur Shifts Data untuk 3 Shift
  const shiftsData = {
    1: {
      shiftNumber: 1,
      teamGroup: roster.shift1,
      shiftName: 'Shift 1 (Pagi)',
      timeRange: '07:00 - 13:00 WIB',
      shiftData: d1.shift || null,
      supervisor_name: d1.shift?.supervisor_name || `Chief Regu ${roster.shift1}`,
      supervisor_nip: d1.shift?.supervisor_nip || null,
      supervisor_signature_url: d1.shift?.supervisor_signature_url || null,
      status: d1.shift?.status || 'open',
      deployments: s1Deployments,
      presentDeployments: s1Deployments.filter((d) => d.deployment_type !== 'absent'),
      absents: s1Absents,
      vehicles: s1Vehicles,
      watchroom: d1.watchroom || {},
    },
    2: {
      shiftNumber: 2,
      teamGroup: roster.shift2,
      shiftName: 'Shift 2 (Siang)',
      timeRange: '13:00 - 20:00 WIB',
      shiftData: d2.shift || null,
      supervisor_name: d2.shift?.supervisor_name || `Chief Regu ${roster.shift2}`,
      supervisor_nip: d2.shift?.supervisor_nip || null,
      supervisor_signature_url: d2.shift?.supervisor_signature_url || null,
      status: d2.shift?.status || 'open',
      deployments: s2Deployments,
      presentDeployments: s2Deployments.filter((d) => d.deployment_type !== 'absent'),
      absents: s2Absents,
      vehicles: s2Vehicles,
      watchroom: d2.watchroom || {},
    },
    3: {
      shiftNumber: 3,
      teamGroup: roster.shift3,
      shiftName: 'Shift 3 (Malam)',
      timeRange: '20:00 - 07:00 WIB',
      shiftData: d3.shift || null,
      supervisor_name: d3.shift?.supervisor_name || `Chief Regu ${roster.shift3}`,
      supervisor_nip: d3.shift?.supervisor_nip || null,
      supervisor_signature_url: d3.shift?.supervisor_signature_url || null,
      status: d3.shift?.status || 'open',
      deployments: s3Deployments,
      presentDeployments: s3Deployments.filter((d) => d.deployment_type !== 'absent'),
      absents: s3Absents,
      vehicles: s3Vehicles,
      watchroom: d3.watchroom || {},
    },
  };

  // Matriks Kesiapan Armada 24 Jam (Shift 1, Shift 2, Shift 3)
  const vehicleMap = new Map();
  const allVehicleList = [...s1Vehicles, ...s2Vehicles, ...s3Vehicles];

  allVehicleList.forEach((v) => {
    const key = v.code_name || v.id || v.vehicle_name;
    if (!vehicleMap.has(key)) {
      vehicleMap.set(key, {
        id: v.id || key,
        code_name: v.code_name,
        vehicle_name: v.vehicle_name,
        category: v.category || 'pendukung',
        license_plate: v.license_plate || '',
        shift1: { status: 'belum_dilaporkan', pic_name: 'Belum Ditunjuk', justification: '', notes: '' },
        shift2: { status: 'belum_dilaporkan', pic_name: 'Belum Ditunjuk', justification: '', notes: '' },
        shift3: { status: 'belum_dilaporkan', pic_name: 'Belum Ditunjuk', justification: '', notes: '' },
      });
    }
  });

  const fillShiftStatus = (vList, shiftKey) => {
    vList.forEach((v) => {
      const key = v.code_name || v.id || v.vehicle_name;
      if (vehicleMap.has(key)) {
        vehicleMap.get(key)[shiftKey] = {
          status: v.status || 'belum_dilaporkan',
          pic_name: v.pic_name || 'Belum Ditunjuk',
          justification: v.justification || '',
          notes: v.notes || '',
          log_id: v.log_id,
          follow_up_status: v.follow_up_status,
          photo_webp_url: v.photo_webp_url,
        };
      }
    });
  };

  fillShiftStatus(s1Vehicles, 'shift1');
  fillShiftStatus(s2Vehicles, 'shift2');
  fillShiftStatus(s3Vehicles, 'shift3');

  const vehiclesDaily = Array.from(vehicleMap.values()).sort((a, b) => {
    const order = { utama: 1, pendukung: 2, posko: 3 };
    const ordA = order[a.category] || 4;
    const ordB = order[b.category] || 4;
    if (ordA !== ordB) return ordA - ordB;
    return (a.code_name || '').localeCompare(b.code_name || '');
  });

  // Jurnal Kegiatan 24 Jam Kronologis
  const activities24h = [
    ...s1Activities.map((a) => ({ ...a, shift_number: 1, team_group: roster.shift1 })),
    ...s2Activities.map((a) => ({ ...a, shift_number: 2, team_group: roster.shift2 })),
    ...s3Activities.map((a) => ({ ...a, shift_number: 3, team_group: roster.shift3 })),
  ].sort((a, b) => (a.activity_time || '').localeCompare(b.activity_time || ''));

  // Rekapitulasi Insiden 24 Jam Kronologis
  const incidents24h = [
    ...s1Incidents.map((i) => ({ ...i, shift_number: i.shift_number || 1, team_group: i.team_group || roster.shift1 })),
    ...s2Incidents.map((i) => ({ ...i, shift_number: i.shift_number || 2, team_group: i.team_group || roster.shift2 })),
    ...s3Incidents.map((i) => ({ ...i, shift_number: i.shift_number || 3, team_group: i.team_group || roster.shift3 })),
  ].sort((a, b) => (a.incident_time || '').localeCompare(b.incident_time || ''));

  // Seluruh Personel Izin/Cuti 24 Jam (Deduplikasi)
  const absentsMap = new Map();
  [...s1Absents, ...s2Absents, ...s3Absents].forEach((a) => {
    const pId = a.personnel_id || a.id;
    if (pId && !absentsMap.has(pId)) {
      absentsMap.set(pId, a);
    }
  });
  const absents24h = Array.from(absentsMap.values());

  // Target shift untuk backward compatibility
  const selectedShiftNum = Number(shift || 1);
  const targetShift = shiftsData[selectedShiftNum] || shiftsData[1];

  return {
    roster,
    deptHeadData,
    shiftsData,
    vehiclesDaily,
    activities24h,
    incidents24h,
    absents24h,
    vehicleIssues,
    // Backward compatibility properties
    shiftData: targetShift.shiftData,
    deployments: targetShift.deployments,
    absents: targetShift.absents,
    vehicles: targetShift.vehicles,
    watchroomData: targetShift.watchroom,
    activities: targetShift.shiftNumber === 1 ? s1Activities : targetShift.shiftNumber === 2 ? s2Activities : s3Activities,
    incidents: targetShift.shiftNumber === 1 ? s1Incidents : targetShift.shiftNumber === 2 ? s2Incidents : s3Incidents,
  };
}

/**
 * Mengunduh berkas PDF Dokumen Resmi Laporan Harian Operasional ARFF YIA (24 Jam)
 * Single Source of Truth untuk Desktop & Mobile (DRY)
 */
export async function downloadShiftReportPdf({ date, shift, team } = {}) {
  const currentDate = date || new Date().toISOString().split('T')[0];
  const params = { date: currentDate };
  if (shift) params.shift = Number(shift);
  if (team) params.team_group = cleanTeam(team);

  const res = await api.get('/reports/pdf', {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  downloadBlob(blob, `Laporan-Harian-Operasional-ARFF-${currentDate}.pdf`);
}

/**
 * Mengunduh dokumen PDF Laporan Kesiapan Armada Resmi
 */
export async function downloadVehicleReportPdf({ period = '1month', start_date = '', end_date = '' } = {}) {
  const query = new URLSearchParams({ period });
  if (start_date) query.append('start_date', start_date);
  if (end_date) query.append('end_date', end_date);

  const res = await api.get(`/reports/vehicles/pdf?${query.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  downloadBlob(blob, `Laporan-Kesiapan-Armada-${period}.pdf`);
}

/**
 * Mengunduh dokumen PDF Laporan Rekapitulasi Insiden Resmi
 */
export async function downloadIncidentReportPdf({ period = '1month', start_date = '', end_date = '', category = '', status = '' } = {}) {
  const query = new URLSearchParams({ period });
  if (start_date) query.append('start_date', start_date);
  if (end_date) query.append('end_date', end_date);
  if (category && category !== 'ALL') query.append('category', category);
  if (status && status !== 'ALL') query.append('status', status);

  const res = await api.get(`/incidents/summary-report/pdf?${query.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  downloadBlob(blob, `Laporan-Rekap-Insiden-${period}.pdf`);
}

/**
 * Mengambil Blob dokumen PDF Laporan Rekapitulasi Logbook Kegiatan Resmi untuk pratinjau
 */
export async function fetchActivityReportPdfBlob({ period = '1month', start_date = '', end_date = '', category = '', team = '' } = {}) {
  const query = new URLSearchParams({ period });
  if (start_date) query.append('start_date', start_date);
  if (end_date) query.append('end_date', end_date);
  if (category && category !== 'ALL') query.append('category', category);
  if (team && team !== 'ALL') query.append('team_group', team);

  const res = await api.get(`/reports/activities/pdf?${query.toString()}`, {
    responseType: 'blob',
  });

  return new Blob([res.data], { type: 'application/pdf' });
}

/**
 * Mengunduh dokumen PDF Laporan Rekapitulasi Logbook Kegiatan Resmi
 */
export async function downloadActivityReportPdf(params = {}) {
  const blob = await fetchActivityReportPdfBlob(params);
  downloadBlob(blob, `Laporan-Logbook-Kegiatan-${params.period || '1month'}.pdf`);
}
