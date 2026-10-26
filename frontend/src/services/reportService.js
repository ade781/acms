import api from './api';
import { cleanTeam } from '../utils/shiftHelper';

/**
 * Service Terpadu Rekapitulasi Laporan Dinas Shift ARFF YIA
 * Single Source of Truth (DRY) untuk penarikan data laporan lintas perangkat (Desktop & Mobile)
 */
export async function fetchShiftReportData({ date, shift, team, signal }) {
  const currentTeam = cleanTeam(team || 'Alpha');
  const currentShift = Number(shift || 1);
  const currentDate = date || new Date().toISOString().split('T')[0];

  const params = `date=${currentDate}&shift=${currentShift}&team_group=${currentTeam}`;
  const options = signal ? { signal } : {};

  const [
    deployRes,
    vehicleRes,
    watchroomRes,
    issueRes,
    actRes,
    incRes,
  ] = await Promise.allSettled([
    api.get(`/deployments/current?${params}`, options),
    api.get(`/readiness/vehicles?${params}`, options),
    api.get(`/readiness/watchroom?${params}`, options),
    api.get(`/reports/vehicle-issues?${params}`, options),
    api.get(`/activities?${params}`, options),
    api.get(`/incidents?${params}`, options),
  ]);

  // Ekstrak data deployment & shift
  let shiftData = null;
  let deptHeadData = null;
  let deployments = [];
  let absents = [];

  if (deployRes.status === 'fulfilled' && deployRes.value?.data?.data) {
    const dData = deployRes.value.data.data;
    shiftData = dData.shift || null;
    deptHeadData = dData.dept_head || null;
    deployments = dData.deployments || [];
    absents = dData.absents || [];
  }

  // Ekstrak data kesiapan 7 armada operasional murni (Watchroom dipisahkan khusus)
  let vehicles = [];
  if (vehicleRes.status === 'fulfilled' && vehicleRes.value?.data?.data) {
    const vData = vehicleRes.value.data.data;
    const rawVehicles = Array.isArray(vData) ? vData : vData.vehicles || [];
    vehicles = rawVehicles.filter(
      (v) => v.category !== 'posko' && v.code_name !== 'WATCHROOM'
    );
  }

  // Ekstrak data kesiapan watchroom
  let watchroomData = {};
  if (watchroomRes.status === 'fulfilled' && watchroomRes.value?.data?.data) {
    watchroomData = watchroomRes.value.data.data || {};
  }

  // Ekstrak data kendala unit & audit trail
  let vehicleIssues = {
    current_issues: [],
    backlog_issues: [],
    resolved_this_shift: [],
  };
  if (issueRes.status === 'fulfilled' && issueRes.value?.data?.data) {
    vehicleIssues = issueRes.value.data.data || vehicleIssues;
  }

  // Ekstrak data logbook kegiatan
  let activities = [];
  if (actRes.status === 'fulfilled' && actRes.value?.data?.data) {
    activities = actRes.value.data.data || [];
  }

  // Ekstrak data insiden
  let incidents = [];
  if (incRes.status === 'fulfilled' && incRes.value?.data?.data) {
    incidents = incRes.value.data.data || [];
  }

  return {
    shiftData,
    deptHeadData,
    deployments,
    absents,
    vehicles,
    watchroomData,
    vehicleIssues,
    activities,
    incidents,
  };
}

import { downloadBlob } from '../utils/fileHelper';

export { downloadBlob };

/**
 * Mengunduh berkas PDF Dokumen Resmi Laporan Shift Operasional Harian
 * Single Source of Truth untuk Desktop & Mobile (DRY)
 */
export async function downloadShiftReportPdf({ date, shift, team } = {}) {
  const currentTeam = cleanTeam(team || 'Alpha');
  const res = await api.get(
    `/reports/pdf?date=${date}&shift=${shift}&team_group=${currentTeam}`,
    { responseType: 'blob' }
  );

  const blob = new Blob([res.data], { type: 'application/pdf' });
  downloadBlob(blob, `Laporan-Shift-${shift}-${currentTeam}-${date}.pdf`);
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
 * Mengunduh dokumen PDF Laporan Rekapitulasi Logbook Kegiatan Resmi
 */
export async function downloadActivityReportPdf({ period = '1month', start_date = '', end_date = '', category = '', team = '' } = {}) {
  const query = new URLSearchParams({ period });
  if (start_date) query.append('start_date', start_date);
  if (end_date) query.append('end_date', end_date);
  if (category && category !== 'ALL') query.append('category', category);
  if (team && team !== 'ALL') query.append('team_group', team);

  const res = await api.get(`/reports/activities/pdf?${query.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  downloadBlob(blob, `Laporan-Logbook-Kegiatan-${period}.pdf`);
}

export default {
  fetchShiftReportData,
  downloadShiftReportPdf,
  downloadVehicleReportPdf,
  downloadIncidentReportPdf,
  downloadActivityReportPdf,
  downloadBlob,
};


