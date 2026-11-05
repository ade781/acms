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
  const roster = sData.roster || { shift_1: 'Alpha', shift_2: 'Bravo', shift_3: 'Charlie', off_team: 'Delta' };
  const matrixVehicles = Array.isArray(sData.matrixVehicles) ? sData.matrixVehicles : (Array.isArray(sData.vehicles) ? sData.vehicles : []);
  const personnelSummary = sData.personnelSummary || {};
  const chiefs = sData.chiefs || {};
  const deployments = Array.isArray(sData.deployments) ? sData.deployments : [];
  const absents = Array.isArray(sData.absents) ? sData.absents : [];
  let vehicles = matrixVehicles;
  const watchroomData = sData.watchroom || {};

  // Unifikasi Posko Komunikasi ke dalam vehicles jika belum ada
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
  const vehicleIssues = sData.vehicle_issues || {
    current_issues: [],
    backlog_issues: [],
    resolved_this_shift: [],
  };
  const activities = Array.isArray(sData.activities) ? sData.activities : [];
  const incidents = Array.isArray(sData.incidents) ? sData.incidents : [];

  return {
    shift_date: currentDate,
    roster,
    matrixVehicles,
    personnelSummary,
    chiefs,
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
 * Helper internal untuk memvalidasi blob PDF dan mengekstrak pesan error jika gagal
 */
async function parseBlobResponse(res) {
  if (!res?.data) {
    throw new Error('Dokumen PDF kosong atau tidak ditemukan.');
  }
  const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
  if (blob.size === 0) {
    throw new Error('Dokumen PDF kosong atau tidak ditemukan.');
  }
  return blob;
}

async function handleBlobRequestError(err) {
  if (err?.response?.data instanceof Blob) {
    try {
      const text = await err.response.data.text();
      const json = JSON.parse(text);
      if (json?.message) {
        err.message = json.message;
      } else if (json?.error) {
        err.message = json.error;
      } else if (text) {
        err.message = text;
      }
    } catch {
      // ignore
    }
  }
  throw err;
}

/**
 * Mengunduh berkas PDF Dokumen Resmi Laporan Harian ARFF (24 Jam • 3 Shift)
 * Single Source of Truth untuk Desktop & Mobile (DRY)
 */
export async function downloadShiftReportPdf({ date } = {}) {
  const currentDate = date || new Date().toISOString().split('T')[0];

  try {
    const res = await api.get('/reports/pdf', {
      params: {
        date: currentDate,
      },
      responseType: 'blob',
    });

    const blob = await parseBlobResponse(res);
    downloadBlob(blob, `Laporan-Harian-ARFF-${currentDate}.pdf`);
  } catch (err) {
    await handleBlobRequestError(err);
  }
}

/**
 * Mengunduh dokumen PDF Laporan Kesiapan Armada Resmi
 */
export async function downloadVehicleReportPdf({ period = '1month', start_date = '', end_date = '' } = {}) {
  const query = new URLSearchParams({ period });
  if (start_date) query.append('start_date', start_date);
  if (end_date) query.append('end_date', end_date);

  try {
    const res = await api.get(`/reports/vehicles/pdf?${query.toString()}`, {
      responseType: 'blob',
    });

    const blob = await parseBlobResponse(res);
    downloadBlob(blob, `Laporan-Kesiapan-Armada-${period}.pdf`);
  } catch (err) {
    await handleBlobRequestError(err);
  }
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

  try {
    const res = await api.get(`/incidents/summary-report/pdf?${query.toString()}`, {
      responseType: 'blob',
    });

    const blob = await parseBlobResponse(res);
    downloadBlob(blob, `Laporan-Rekap-Insiden-${period}.pdf`);
  } catch (err) {
    await handleBlobRequestError(err);
  }
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

  try {
    const res = await api.get(`/reports/activities/pdf?${query.toString()}`, {
      responseType: 'blob',
    });

    return await parseBlobResponse(res);
  } catch (err) {
    await handleBlobRequestError(err);
  }
}

/**
 * Mengunduh dokumen PDF Laporan Rekapitulasi Logbook Kegiatan Resmi
 */
export async function downloadActivityReportPdf(params = {}) {
  const blob = await fetchActivityReportPdfBlob(params);
  downloadBlob(blob, `Laporan-Logbook-Kegiatan-${params.period || '1month'}.pdf`);
}

/**
 * Mengambil Blob dokumen PDF Laporan 5 (Buku Induk Personel Regu & Akun Sistem) untuk pratinjau
 */
export async function fetchPersonnelReportPdfBlob({ team = '', status = '', search = '' } = {}) {
  const query = new URLSearchParams();
  if (team && team !== 'ALL') query.append('team_group', team);
  if (status && status !== 'ALL' && status !== 'all') query.append('status', status);
  if (search) query.append('search', search);

  try {
    const res = await api.get(`/personnel/export/pdf?${query.toString()}`, {
      responseType: 'blob',
    });

    return await parseBlobResponse(res);
  } catch (err) {
    await handleBlobRequestError(err);
  }
}

/**
 * Mengunduh dokumen PDF Laporan 5 (Buku Induk Personel Regu & Akun Sistem)
 */
export async function downloadPersonnelReportPdf(params = {}) {
  const blob = await fetchPersonnelReportPdfBlob(params);
  const teamLabel = params.team && params.team !== 'ALL' ? `_${params.team}` : '';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  downloadBlob(blob, `Buku_Induk_Personel_ARFF_YIA${teamLabel}_${today}.pdf`);
}

