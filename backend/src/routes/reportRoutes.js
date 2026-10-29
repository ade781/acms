import { Router } from 'express';
import {
  getShiftReportPdf,
  getVehicleIssuesAudit,
  getVehiclesReportPdf,
  getIncidentsReportPdf,
  getActivitiesReportPdf,
  getShiftSummaryReport,
} from '../controllers/reportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/shift-summary', getShiftSummaryReport);
router.get('/pdf', getShiftReportPdf);
router.get('/shift/pdf', getShiftReportPdf);
router.get('/export/pdf', getShiftReportPdf);
router.get('/vehicle-issues', getVehicleIssuesAudit);
router.get('/vehicles/pdf', getVehiclesReportPdf);
router.get('/incidents/pdf', getIncidentsReportPdf);
router.get('/activities/pdf', getActivitiesReportPdf);
router.get('/activities/summary-report/pdf', getActivitiesReportPdf);

export default router;
