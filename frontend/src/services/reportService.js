import api from './api';
import { cleanTeam } from '../utils/shiftHelper';
import { downloadBlob } from '../utils/fileHelper';

/**
 * Service Terpadu Rekapitulasi Laporan Dinas Shift ARFF YIA
 * Single Source of Truth (DRY) untuk penarikan data laporan lintas perangkat (Desktop & Mobile)
 * Menggunakan 1 roundtrip HTTP ke endpoint agregasi /reports/shift-summary
 */
export async function fetchShiftReportData({ date, shift, team, signal }) {
  const currentTeam = cleanTeam(team || 'Alpha');
  const currentShift = Number(shift || 1);
  const currentDate = date || new Date().toISOString().split('T')[0];

  const options = {
    params: {
      date: currentDate,
      shift: currentShift,
      team_group: currentTeam,
    },
    ...(signal ? { signal } : {}),
  };

  const res = await api.get('/reports/shift-summary', options);
  const sData = res.data?.data || res.data || {};

  const shiftData = sData.shift || null;
  const deptHeadData = sData.dept_head || sData.official || null;
  const deployments = Array.isArray(sData.deployments) ? sData.deployments : [];
  const absents = Array.isArray(sData.absents) ? sData.absents : [];
  const vehicles = Array.isArray(sData.vehicles)
    ? sData.vehicles.filter((v) => v.category !== 'posko' && v.code_name !== 'WATCHROOM')
    : [];
  const watchroomData = sData.watchroom || {};
  const vehicleIssues = sData.vehicle_issues || {
    current_issues: [],
    backlog_issues: [],
    resolved_this_shift: [],
  };
  const activities = Array.isArray(sData.activities) ? sData.activities : [];
  const incidents = Array.isArray(sData.incidents) ? sData.incidents : [];

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
 * Mengunduh berkas PDF Dokumen Resmi Laporan Shift Operasional Harian
 * Single Source of Truth untuk Desktop & Mobile (DRY)
 */
export async function downloadShiftReportPdf({ date, shift, team } = {}) {
  const currentDate = date || new Date().toISOString().split('T')[0];
  const currentShift = Number(shift || 1);
  const currentTeam = cleanTeam(team || 'Alpha');

  const res = await api.get('/reports/pdf', {
    params: {
      date: currentDate,
      shift: currentShift,
      team_group: currentTeam,
    },
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  downloadBlob(blob, `Laporan-Shift-${currentShift}-${currentTeam}-${currentDate}.pdf`);
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

