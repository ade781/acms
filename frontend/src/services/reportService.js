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

  // Ekstrak data kesiapan 8 armada
  let vehicles = [];
  if (vehicleRes.status === 'fulfilled' && vehicleRes.value?.data?.data) {
    const vData = vehicleRes.value.data.data;
    vehicles = Array.isArray(vData) ? vData : vData.vehicles || [];
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

export default {
  fetchShiftReportData,
};
