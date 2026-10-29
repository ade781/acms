/**
 * Controller Laporan Terpadu Operasional ARFF YIA
 * Modul dipecah berdasarkan domain spesifik:
 * - shiftReportsController: PDF Laporan Shift & Ringkasan Agregasi Shift
 * - vehicleReportsController: Pelacakan Kendala & PDF Kesiapan Armada
 * - incidentReportsController: PDF Rekapitulasi Insiden
 * - activityReportsController: PDF Logbook Kegiatan
 */

export { getOfficialSignatory } from '../utils/officialHelper.js';

export {
  getShiftReportPdf,
  getShiftSummaryReport
} from './reports/shiftReportsController.js';

export {
  fetchVehicleIssuesAuditData,
  getVehicleIssuesAudit,
  getVehiclesReportPdf
} from './reports/vehicleReportsController.js';

export {
  getIncidentsReportPdf
} from './reports/incidentReportsController.js';

export {
  getActivitiesReportPdf
} from './reports/activityReportsController.js';
