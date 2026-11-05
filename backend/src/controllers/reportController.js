/**
 * Controller Laporan Terpadu Operasional ARFF YIA
 * Modul dipecah berdasarkan domain spesifik:
 * - shiftReportsController: PDF Laporan Shift & Ringkasan Agregasi Shift
 * - vehicleReportsController: PDF Kesiapan Armada
 * - activityReportsController: PDF Logbook Kegiatan
 */

export { getOfficialSignatory } from '../utils/officialHelper.js';

export {
  getShiftReportPdf,
  getShiftSummaryReport
} from './reports/shiftReportsController.js';

export {
  getVehiclesReportPdf
} from './reports/vehicleReportsController.js';

export {
  getActivitiesReportPdf
} from './reports/activityReportsController.js';

export {
  getPersonnelReportPdf
} from './reports/personnelReportController.js';
