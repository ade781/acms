import api from './api';
import { cleanTeam } from '../utils/shiftHelper';

/**
 * Service Terpadu Rekapitulasi Laporan Dinas Shift ARFF YIA
 * Single Source of Truth (DRY) untuk penarikan data laporan lintas perangkat (Desktop & Mobile)
 */
export async function fetchShiftReportData({ date, shift, team }) {
  const currentTeam = cleanTeam(team || 'Alpha');
  const currentShift = Number(shift || 1);
  const currentDate = date || new Date().toISOString().split('T')[0];

  const params = `date=${currentDate}&shift=${currentShift}&team_group=${currentTeam}`;

  const [
    deployRes,
    vehicleRes,
    watchroomRes,
    issueRes,
    actRes,
    incRes,
  ] = await Promise.allSettled([
    api.get(`/deployments/current?${params}`),
    api.get(`/readiness/vehicles?${params}`),
    api.get(`/readiness/watchroom?${params}`),
    api.get(`/reports/vehicle-issues?${params}`),
    api.get(`/activities?${params}`),
    api.get(`/incidents?${params}`),
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
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Laporan-Kesiapan-Armada-${period}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Mengunduh dokumen PDF Laporan Rekapitulasi Insiden Resmi
 */
export async function downloadIncidentReportPdf({ period = '1month', start_date = '', end_date = '' } = {}) {
  const query = new URLSearchParams({ period });
  if (start_date) query.append('start_date', start_date);
  if (end_date) query.append('end_date', end_date);

  const res = await api.get(`/reports/incidents/pdf?${query.toString()}`, {
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Laporan-Rekap-Insiden-${period}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default {
  fetchShiftReportData,
  downloadVehicleReportPdf,
  downloadIncidentReportPdf,
};

